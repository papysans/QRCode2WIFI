# Research: WeChat Mini Program Integration (MOCK → REAL)

- **Query**: Official WeChat Mini Program (微信小程序) APIs required to replace MOCK adapters with REAL implementations (code2session, access_token/stable_token, wxacode.getUnlimited, rewarded video server callback, wx.connectWifi, 流量主/类目/域名备案), plus mapping to our code.
- **Scope**: external (official WeChat docs) + internal (mapping to our code)
- **Date**: 2026-05-31

> ## CRITICAL METHOD CAVEAT — READ FIRST
> The dedicated web-search MCP tools referenced in the task brief (`mcp__exa__web_search_exa`, `mcp__exa__get_code_context_exa`, `mcp__grok-search`) and the WebSearch-backed `deep-research` skill were **NOT available in this research session** (only Read/Write/Glob/Grep/Bash/Skill were exposed). Therefore the API facts below are drawn from the agent's internal knowledge of WeChat's documentation (knowledge cutoff January 2026). They are accurate for the **stable, long-standing** parts of these APIs, but **every numeric threshold, error code list, and policy value below MUST be re-verified against the live official docs at integration time.** Each section lists the exact official URL to verify against. Treat this document as a precise checklist + implementation scaffold, NOT as a substitute for opening the official console/docs.

---

## 1. 登录 code2session (`auth.code2session`)

**Official doc**: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html
**Client API doc (`wx.login`)**: https://developers.weixin.qq.com/miniprogram/dev/api/open-api/login/wx.login.html

### Endpoint
```
GET https://api.weixin.qq.com/sns/jscode2session
```

### Flow
1. Miniprogram calls `wx.login()` → returns a short-lived `code` (the `js_code`). This `code` is **single-use** and expires in **~5 minutes**. It is NOT the openid.
2. Miniprogram sends `code` to OUR backend (`POST /auth/login`).
3. Backend calls `code2session` with `appid` + `secret` + that `js_code` to exchange for `openid` (+ `session_key`, optionally `unionid`).

### Request params (query string)
| Param | Required | Value |
|---|---|---|
| `appid` | yes | Mini program AppID (`WX_APPID`) |
| `secret` | yes | Mini program AppSecret (`WX_SECRET`) — **server-only secret, never ship to client** |
| `js_code` | yes | the `code` from `wx.login` |
| `grant_type` | yes | fixed string `authorization_code` |

### Response (JSON body)
| Field | Description |
|---|---|
| `openid` | User's unique id **for this mini program** (stable per-user-per-app). This is what we store. |
| `session_key` | Session key for decrypting encrypted data / signature checks. **Sensitive — keep server-side, never return to client.** Rotates on each successful login. |
| `unionid` | Present only if the mini program is bound to a 微信开放平台 (open platform) account. May be absent. |
| `errcode` | 0 on success (often omitted entirely on success) |
| `errmsg` | error text |

### Key error codes (VERIFY current list)
| errcode | Meaning | Handling |
|---|---|---|
| `-1` | System busy / transient | retry with backoff |
| `40029` | invalid `js_code` (expired or already used) | client must re-run `wx.login` and retry |
| `45011` | API call frequency limited (100/min per user) | backoff |
| `40226` | high-risk user blocked from login | reject login |
| `40013` | invalid appid | config error |
| `41008` | missing js_code | request build error |

### Gotchas
- `js_code` is **single-use**; calling `code2session` twice with the same code fails (`40029`). Do NOT cache/replay it.
- `code2session` itself does **NOT** require an `access_token` — it authenticates via `appid`+`secret` directly. (Different from `getUnlimited`.)
- `session_key` changes every time the user logs in again; if you persist it for later decryption you must update it on each login.
- Response can return HTTP 200 with an `errcode` body even on logical failure — must check the body, not just status code.
- **Policy-dependent**: WeChat has periodically deprecated the legacy `auth.code2Session` "无需 access_token" form in favor of one requiring `access_token` for some account types. **VERIFY** whether the current `sns/jscode2session` still works with bare `appid`+`secret` for your account type at integration time.

---

## 2. access_token — `cgi-bin/token` vs `cgi-bin/stable_token`

**Legacy doc**: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-access-token/getAccessToken.html
**Stable token doc**: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-access-token/getStableAccessToken.html

`access_token` is the **global** credential required by almost all server-side OpenAPIs (including `getUnlimited`). It is **per-app, NOT per-user**.

### Option A — legacy `getAccessToken`
```
GET https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=APPID&secret=SECRET
```
- Response: `{ "access_token": "...", "expires_in": 7200 }`
- **Validity ~7200s (2 hours).**
- Each call **invalidates the previous token after a short overlap window** (~5 min grace). Concurrent uncoordinated callers will fight and invalidate each other's tokens.

### Option B — `getStableAccessToken` (RECOMMENDED, newer)
```
POST https://api.weixin.qq.com/cgi-bin/stable_token
Content-Type: application/json
{
  "grant_type": "client_credential",
  "appid": "APPID",
  "secret": "SECRET",
  "force_refresh": false
}
```
- Response: `{ "access_token": "...", "expires_in": 7200 }`
- **Two modes:**
  - `force_refresh=false` (normal mode): returns the current valid token; multiple callers get the **same** token, no mutual invalidation. The previous token stays valid until natural expiry. **This is the safe default for a distributed/multi-instance backend.**
  - `force_refresh=true`: forces a brand-new token (use sparingly).
- **Call frequency limit (VERIFY current value)**: historically the daily quota for token endpoints is on the order of **~2000 calls/day**; `force_refresh=true` is more tightly limited. Because normal-mode `stable_token` returns the cached server-side token, you do not burn quota fetching it repeatedly — but you should still cache locally.

### Why cache centrally (not per-request)
- Token is **global per app** with a **shared daily quota**. If every API request fetched its own token, you'd (a) exhaust the daily quota, (b) with the legacy endpoint, invalidate tokens across instances causing `40001 invalid credential` storms.
- A central cache (Redis — we already have `REDIS_URL`) gives a single source of truth across all NestJS instances.

### Recommended caching strategy (for our new token cache service)
1. Store in Redis under a key like `wx:access_token`.
2. Cache TTL = `expires_in - 300` (refresh ~5 min early to avoid edge expiry).
3. Use `stable_token` with `force_refresh=false` as the fetch primitive.
4. Guard refresh with a **distributed lock** (Redis `SET NX PX`) so only one instance refreshes at a time (thundering-herd prevention).
5. On any API call returning `40001` / `42001` (token invalid/expired), do a one-time forced refresh + retry.

### Common token-related error codes
| errcode | Meaning |
|---|---|
| `40001` | invalid credential / access_token invalid |
| `42001` | access_token expired |
| `40013` | invalid appid |
| `45009` | API minute-level rate limit hit |
| `-1` | system busy, retry |

---

## 3. 小程序码 `wxacode.getUnlimited`

**Official doc**: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/qr-code/getUnlimitedQRCode.html

### Endpoint
```
POST https://api.weixin.qq.com/wxa/getwxacodeunlimited?access_token=ACCESS_TOKEN
Content-Type: application/json
```
(`access_token` goes in the **query string**, body is JSON.)

### Request body params
| Param | Required | Notes |
|---|---|---|
| `scene` | yes | **Max 32 visible chars.** Allowed charset is restricted: digits, English letters, and a limited set of special chars `!#$&'()*+,/:;=?@-._~`. **Spaces and most punctuation are NOT allowed.** |
| `page` | no | Must be an **already-published** page path, e.g. `pages/detail/index`. **No leading slash. No query string** — extra params must go through `scene`, not `page`. If omitted, defaults to home page. |
| `check_path` | no (bool) | Default `true`. If `true`, WeChat verifies `page` exists (and is published). Set `false` to generate codes for unpublished pages (e.g. in dev). |
| `env_version` | no | `release` (default) / `trial` / `develop`. Lets you target trial/dev builds for unpublished pages. |
| `width` | no | int, default 430, range ~280–1280 px |
| `auto_color` | no (bool) | auto color from logo |
| `line_color` | no | `{r,g,b}` when `auto_color=false` |
| `is_hyaline` | no (bool) | transparent background |

### Response
- **On success: the response body IS the binary image (PNG) bytes** — `Content-Type: image/png` (or `image/jpeg`). In Node read it as a Buffer (axios `responseType: 'arraybuffer'`).
- **On failure: the response body is JSON** `{ "errcode": ..., "errmsg": ... }` even though you requested an image. **You MUST detect this**: check `Content-Type`, or sniff the first bytes — if it parses as JSON with `errcode`, it's an error, not an image.

### Key error codes (VERIFY current list)
| errcode | Meaning |
|---|---|
| `40097` | invalid request params (e.g. scene too long / illegal char, bad page) |
| `45009` | API minute rate limit reached |
| `41030` | `page` does not exist / not published (when `check_path=true`) |
| `40001`/`42001` | access_token invalid/expired |
| `40169` | params error (alternate code seen for bad page/scene) |

### Encoding our `sid` into `scene` and reading it back
- **Encode (server)**: put our `sid` directly into `scene` if it fits the charset and ≤32 chars. If `sid` is a UUID (36 chars with dashes) it is **TOO LONG** — must shorten. Options: use a short slug/base62 id ≤32 chars, or strip dashes from UUID (32 hex chars — fits exactly, hex is in allowed charset). **Recommend a dedicated short scene id, not the raw UUID.**
- **Parse (miniprogram)**: when the code is scanned, the target page receives the scene in `onLoad(options)`:
  ```js
  Page({
    onLoad(options) {
      // scanned-via-mini-program-code -> options.scene is URL-encoded
      const scene = decodeURIComponent(options.scene || '');
      // scene now holds our sid; fetch detail by sid
    }
  })
  ```
  - **Gotcha**: `options.scene` is **URL-encoded** — always `decodeURIComponent`.
  - **Gotcha**: `options.scene` is only populated when entering via the unlimited code; when navigating internally you pass normal query params (e.g. `?sid=...`), which arrive as `options.sid`. Handle both code paths.
  - The `page` you pass to `getUnlimited` is the destination page; ensure it's published before generating production codes (or use `check_path=false` + `env_version`).

### Rate limit
- `getUnlimited` has a **daily call quota** (historically tens of thousands/day, tiered by account) and per-minute limiting (`45009`). **VERIFY current quota** in MP console (开发管理 → 接口调用频次). Cache/persist generated images (we already have `UPLOAD_DIR`) so we don't regenerate the same `sid` repeatedly.

---

## 4. 激励视频广告 (Rewarded Video) — client + SERVER-SIDE callback

**Client ad doc**: https://developers.weixin.qq.com/miniprogram/dev/api/ad/RewardedVideoAd.html
**Server callback doc (服务器回调发放奖励)**: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/component/rewarded-video-ad-server-callback.html
**流量主**: https://developers.weixin.qq.com/miniprogram/introduction/index.html (流量主 section)

### Client side (already scaffolded in our code)
```js
const ad = wx.createRewardedVideoAd({ adUnitId: 'AD_UNIT_ID' });
ad.onClose((res) => {
  // res.isEnded === true  -> user watched to the end (reward eligible)
  // res.isEnded === false -> user closed early (no reward)
});
ad.show().catch(() => ad.load().then(() => ad.show()));
```
- The ad instance is a **singleton per `adUnitId`** — create once, reuse.
- `res.isEnded` is the **client-side** completion flag. **It is forgeable** by a malicious client and MUST NOT be the sole basis for unlocking.

### Server-side callback (the anti-forgery mechanism)
- **Prerequisite**: the mini program must be a **流量主 (traffic master)** and you must **enable "服务器回调" (server callback)** for the specific 激励视频 广告位 (ad unit) in the MP console, configuring a **回调 URL** and a **回调密钥 (callback key/secret)**.
- When a user genuinely completes a rewarded ad, **WeChat's server makes a GET request to YOUR configured callback URL**. This is server-to-server and cannot be forged by the client.

#### Callback request (GET) query params (VERIFY exact names/order against doc)
| Param | Description |
|---|---|
| `user_openid` | the openid of the user who watched the ad |
| `sign` | signature for verification |
| `trans_id` | unique transaction id for this reward (use for idempotency/dedup) |
| `reward` | the reward value/identifier you configured |
| `extra` | optional custom payload you passed in (e.g. our `sid` — set via `ad.setServerSideVerifyOptions({ adUnitId, customData })` if using server-side verify options) |
| `nonce` / `timestamp` | (may be present depending on version) |

#### Signature verification
- The signature is computed by WeChat over the request params using your **callback key**. **VERIFY the exact algorithm and the exact field set/ordering in the official doc** — historically it has been an HMAC/SHA-style hash over a sorted concatenation of the params + key. Do NOT guess the field order; copy it verbatim from the doc at integration time.
- Your endpoint must:
  1. Recompute the signature with your callback key and compare (constant-time compare).
  2. On match → grant the reward (unlock connect) keyed by `trans_id` (idempotent — same `trans_id` must not double-grant).
  3. Respond with the exact success body WeChat expects (historically `{"errcode":0,"errmsg":"ok"}` or `success`); **VERIFY** the required success response, otherwise WeChat retries.
- **Retry behavior**: WeChat retries the callback if it doesn't get the expected success response → another reason `trans_id` idempotency is mandatory.

### How this maps to our flow
- Client watches ad → `isEnded` lets the UI proceed optimistically, but the **authoritative unlock** should be driven by the server callback (or at minimum, `verifyAdToken` should check a server-recorded `trans_id`, not a client string).
- Our current `adToken: 'wechat-completed'` is a **placeholder and is forgeable** — the real implementation must replace it with verification against a server-side record created by the WeChat callback (e.g. keyed by `user_openid`+`sid`+`trans_id`).

### Gotcha / policy
- **流量主 prerequisite** (see §6) — no server callback without it.
- Ad fill is not guaranteed; `ad.show()` can reject (no ad available) → must `load()` then retry, and gracefully degrade if still no ad.

---

## 5. `wx.connectWifi` — capabilities & iOS/Android limitations

**Official doc**: https://developers.weixin.qq.com/miniprogram/dev/api/device/wifi/wx.connectWifi.html
**startWifi**: https://developers.weixin.qq.com/miniprogram/dev/api/device/wifi/wx.startWifi.html

### Required usage shape
- Must call **`wx.startWifi()` first** (initialize the Wi-Fi module) before `connectWifi`/`getWifiList`/etc.
- `wx.connectWifi({ SSID, password, ... })` — **`SSID` is required**; for some scenarios `BSSID` is also needed (esp. iOS / hidden networks). `password` required for secured networks.

### Platform limitations (VERIFY current values — these shift with iOS/base-library versions)
| Aspect | iOS | Android |
|---|---|---|
| Min system | iOS 11.0+ (Wi-Fi APIs require it) | Android 6.0+ (location permission needed for scanning) |
| `SSID` | required | required |
| `BSSID` | often required for reliable connect | optional |
| 5GHz band | **caveats** — historically iOS Wi-Fi APIs had trouble with / restrictions on 5G networks; Android also less reliable on 5G. Prefer 2.4GHz SSIDs for connect flows. **VERIFY current.** | 5G support varies by device/version |
| Scanning (`getWifiList`) | limited; iOS may not return full list | needs precise location permission |

### User-present / privacy requirements (POLICY/VERSION-DEPENDENT — VERIFY)
- WeChat tightened device APIs: recent base libraries require the user to have **granted the relevant privacy authorization** and the mini program to **declare it in 隐私协议 (privacy agreement)**. Wi-Fi / device APIs may require calling **`wx.requirePrivacyAuthorize`** (or registering via `wx.onNeedPrivacyAuthorization`) before the API is allowed, and the 隐私协议声明 must list the corresponding 用户信息 usage. **VERIFY which base-library version enforces this and whether `connectWifi`/`getWifiList` are in the gated set.**
- Some flows require the action to be **user-initiated** (triggered by a tap), not auto-run on page load.

### Common error codes (VERIFY current list)
| errCode | Meaning |
|---|---|
| `0` | ok |
| `12000` | not initialized (call `startWifi` first) |
| `12001` | current system not supported |
| `12002` | password error |
| `12003` | connection timeout |
| `12004` | duplicate request |
| `12005` | Wi-Fi not turned on |
| `12006` | gps/location not turned on (Android) |
| `12007` | user denied |
| `12008` | invalid SSID |
| `12009` | system config error |
| `12010` | system internal error |

### Why a password fallback is necessary
- `connectWifi` can fail for many reasons outside our control: wrong/empty password (`12002`), 5G-band incompatibility, iOS BSSID requirements, user denies the system prompt (`12007`), unsupported OS (`12001`), or silent failure where the system Wi-Fi prompt is dismissed.
- Therefore the UX must **display the SSID + password (and ideally a copy button)** so the user can connect manually if the programmatic `connectWifi` fails. Our client already resolves `{ ok:false, errorCode }` on fail — the UI must surface the manual-connect fallback on that branch.

---

## 6. 开通门槛与类目审核 (流量主 / 类目 / 服务器域名 + ICP备案)

**流量主介绍**: https://developers.weixin.qq.com/miniprogram/introduction/index.html
**类目 (categories)**: https://developers.weixin.qq.com/miniprogram/product/material/getcategory.html (类目说明 in MP console 设置 → 基本设置 → 服务类目)
**服务器域名**: https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html

### 流量主 (traffic master) 开通门槛 (POLICY-DEPENDENT — VERIFY current value)
- Historically required the mini program to reach an **accumulated UV (独立访客) threshold** — the commonly cited figure has been **≥1000 累计独立访客 (UV)** before 流量主 can be enabled, plus a verified (已认证) non-individual or qualifying account. **The exact UV number and account-type requirements change — VERIFY in MP console (流量主 → 开通) at integration time.**
- Without 流量主 you **cannot** use 激励视频广告 nor configure the **server-side reward callback** (§4).

### WiFi / 工具 类目 (category) submission
- Mini programs must register a **服务类目 (service category)**. A WiFi-connection / tools product typically falls under **工具 (tools)** or a WiFi-specific subcategory. Some WiFi/networking categories require **额外资质 (extra qualification documents)** and may be restricted to 企业 (enterprise) accounts.
- Category choice affects whether certain device APIs and ad eligibility are approved. **VERIFY the current 类目 list and required 资质 for WiFi/工具 in the console.**

### 服务器域名 (request domain) whitelist + ICP备案 (POLICY-DEPENDENT)
- All network requests (`wx.request`, image downloads, uploads, sockets) from the production mini program must use domains added to the **request 合法域名 (legal domain whitelist)** in MP console (开发管理 → 开发设置 → 服务器域名).
  - Must be **HTTPS** (TLS), no IP, no port restrictions beyond standard, max number of domains per type is limited.
  - During local dev, the WeChat DevTools "不校验合法域名" option bypasses this (our `app.js` notes this) — but production WILL enforce it.
- **ICP备案**: WeChat requires server domains used by mini programs to have valid **ICP备案** (China mainland filing). Since ~2023 WeChat enforces that whitelisted server domains are ICP-备案'd; un-备案 domains may be rejected from the whitelist. **VERIFY current enforcement + whether your hosting/domain is 备案'd.**

### Gotchas
- `getUnlimited`, `code2session`, `stable_token` are called **server→`api.weixin.qq.com`** so they are NOT subject to the *client* domain whitelist — but OUR backend API (`apiBase`) IS, and must be HTTPS + whitelisted + likely 备案'd for production.
- Our current `apiBase: 'http://localhost:3000/api'` (HTTP) only works in DevTools with domain-check disabled; production needs an HTTPS, whitelisted, 备案'd domain.

---

## Mapping: Findings → OUR code that must change

| Our file / location | What changes | Driven by section |
|---|---|---|
| `apps/server/src/auth/auth.service.ts` → `resolveOpenid()` | Replace `throw 'not implemented'` (wechat branch) with a call to `code2session` (`GET sns/jscode2session`, `grant_type=authorization_code`) using `WX_APPID`/`WX_SECRET` + the client `js_code`; return `openid`; handle `errcode` 40029/45011/-1; keep `session_key` server-side only. | §1 |
| `apps/server/src/adapters/wechat.adapters.ts` → `WechatQrCodeProvider.generate(sid)` | Get cached access_token, `POST /wxa/getwxacodeunlimited?access_token=...` with `{ scene: <short sid ≤32 chars, allowed charset>, page:'pages/detail/index' (no leading slash, published), check_path, env_version }`, `responseType: arraybuffer`; **detect JSON error body vs image bytes**; persist image to `UPLOAD_DIR`, return `{imageUrl, path}`. Ensure `sid`→`scene` fits 32-char/charset (shorten UUID). | §2, §3 |
| `apps/server/src/adapters/wechat.adapters.ts` → `WechatAdProvider.verifyAdToken(adToken)` | Replace forgeable string check with verification against a server-recorded reward (created by WeChat's **server callback**). Add a new **callback endpoint** (controller) that receives WeChat's GET callback, recomputes `sign` with the callback key, validates, records `trans_id` idempotently keyed to `user_openid`/`sid`. `verifyAdToken` then checks that record. | §4 |
| **NEW** access_token cache service (e.g. `apps/server/src/wechat/access-token.service.ts`) | Central token manager: fetch via `cgi-bin/stable_token` (`force_refresh:false`), cache in **Redis** (`REDIS_URL`) with TTL `expires_in-300`, distributed-lock refresh, retry on `40001/42001`. Consumed by `WechatQrCodeProvider` and any future OpenAPI calls. | §2 |
| `apps/miniprogram/utils/adapters.js` (`MODE='wechat'`) | Switch `MODE` to `'wechat'` for prod; replace `adUnitId:'YOUR_AD_UNIT_ID'` with `AD_UNIT_ID`; keep `connectWifi` but ensure `startWifi` is initialized, handle error codes 12000–12010, and the UI must show manual password fallback on `ok:false`. Add privacy-authorize handling if base-library requires it. | §4, §5 |
| `apps/miniprogram/utils/api.js` (`apiBase` usage) + `apps/miniprogram/app.js` (`globalData.apiBase`) | Replace `http://localhost:3000/api` with the production **HTTPS, whitelisted, ICP-备案'd** backend domain. `login()` flow already passes `wx.login` `code` → backend; that path is correct for real mode. | §1, §6 |
| Detail page `onLoad` (`apps/miniprogram/pages/detail/index.js`) | Parse `decodeURIComponent(options.scene)` for scanned-code entry (carries our `sid`); also handle internal `options.sid`. | §3 |
| `apps/server/.env.example` | Add keys: `WX_APPID`, `WX_SECRET`, `AD_UNIT_ID`, `WX_AD_CALLBACK_KEY` (rewarded-video callback signing key), `WX_AD_CALLBACK_PATH` (or full URL), optional `WX_QR_PAGE` (default `pages/detail/index`), `WX_QR_ENV_VERSION` (`release`). `ADAPTER_MODE=wechat` already exists; `REDIS_URL` already exists (reuse for token cache). | §1, §2, §3, §4 |

### Suggested `.env.example` additions (for the implement agent to add — NOT added here)
```
# 微信小程序凭据（服务端专用，切勿下发客户端）
WX_APPID="wx0000000000000000"
WX_SECRET="server-only-app-secret"
# 激励视频广告位 + 服务器回调签名密钥
AD_UNIT_ID="adunit-xxxxxxxxxxxx"
WX_AD_CALLBACK_KEY="rewarded-video-callback-key"
# 小程序码目标页（已发布、无前导斜杠、无 query）
WX_QR_PAGE="pages/detail/index"
WX_QR_ENV_VERSION="release"
```

---

## Caveats / Not Found / MUST-VERIFY checklist

These are version- or policy-dependent and **must be confirmed against the live official docs/console at integration time** (web-search tools were unavailable this session, see top caveat):

1. Whether `sns/jscode2session` still works with bare `appid`+`secret` (no access_token) for your account type. (§1)
2. Exact current daily quota for `cgi-bin/token` / `stable_token` and per-minute limits. (§2)
3. Exact `getUnlimited` daily quota for your account tier; exact current error-code list (40097/41030/45009). (§3)
4. **Rewarded-video server callback: exact query-param names, exact signature algorithm + field ordering, and exact required success-response body.** Do NOT guess — copy verbatim from the doc. (§4)
5. Which base-library version gates Wi-Fi/device APIs behind `requirePrivacyAuthorize` + 隐私协议声明, and whether `connectWifi`/`getWifiList` are in the gated set. (§5)
6. Current iOS/Android `connectWifi` constraints (5GHz handling, BSSID requirement on iOS, exact error-code table). (§5)
7. Current **流量主 开通 UV threshold** (cited ~1000 UV — VERIFY) and account-type requirement. (§6)
8. Current **WiFi/工具 类目** list and any extra 资质 required; whether enterprise account is mandatory. (§6)
9. Current **服务器域名 whitelist rules + ICP备案 enforcement** for production. (§6)

**Not found / out of scope this session**: exact live numeric values for all items above (no web access). All endpoint shapes, request/response field structures, and the overall integration mapping ARE provided and are stable/reliable.
