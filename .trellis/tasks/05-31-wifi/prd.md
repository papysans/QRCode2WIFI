# WiFi 扫码广告小程序 + 运营监控后台

## Decision (ADR-lite) — 技术栈

**Decision**: 方案 A 全栈 TypeScript/Node。
* 小程序：原生微信小程序（TS）
* 后端：NestJS (Node + TS)
* 数据库：PostgreSQL + Prisma；events 表做漏斗/排行聚合
* 缓存/实时：Redis
* 运营后台前端：React + Ant Design Pro + ECharts
**Consequences**: 一种语言贯穿全栈，维护成本低，适配层模式干净；复杂分析靠 SQL 聚合足够。

## Decision (ADR-lite) — 仓库结构

**Decision**: Monorepo（pnpm workspaces）。
```
/apps/miniprogram   微信小程序
/apps/admin         运营后台 (React + AntD Pro)
/apps/server        后端 (NestJS)
/packages/shared    共享类型（事件定义、API 契约、DTO）
```
**Consequences**: 事件埋点/API 类型一处定义三端复用，从根上避免字段对不齐。

## Goal

做一个微信小程序：商家创建店铺并配置 WiFi、生成专属小程序码；顾客扫码后看完激励视频广告再一键连接该店 WiFi。同时为**平台运营方（项目方自己）**做一个独立的 Web 监控后台，跨所有店铺看全局数据（流量漏斗、广告收益、店铺趋势排行、异常实时监控）。第一版目标是**验证使用量**，暂不做提现/分成/商家认证。

## What I already know

来自原型 `wifi扫码广告流程设计_v2.html` + 用户澄清：

* 账号体系：微信 `openid` 即账号，不预先区分商家/顾客；谁创建店铺谁就是该店铺 `owner`。
* 入口 A（管理）：打开小程序 → 我的店铺列表 → 创建店铺（店名/WiFi 名/密码/可选点评团购外链）→ 店铺详情管理（改配置、生成码、看基础数据）。权限：`shop.owner_openid == 当前 openid` 才可编辑。
* 入口 B（连接）：扫门店码（码仅带 `sid`，解析为 `shop_id`，不含明文密码）→ 当前门店页 → 看完 15s 激励视频（完成回调成功才解锁）→ `wx.connectWifi` 一键连接 → 失败时显示密码兜底。
* 小程序内已有「单店数据页」：扫码人数、广告完成、连接点击。
* 监控后台受众：**平台运营方（自己）**，看全局。
* 监控后台四大模块：流量漏斗 / 广告收益 / 店铺与趋势排行 / 异常与实时监控。
* 技术栈：用户委托我推荐。

## Assumptions (temporary)

* 项目为全新仓库，无历史代码（已确认）。
* 小程序为微信原生小程序（非 H5/支付宝）。
* 广告为微信流量主激励视频广告。
* 后台与小程序后端共用同一套 API / 数据库。

## Decision (ADR-lite) — 微信资质与适配层

**Context**: 目前无小程序 appid、未开通流量主（企业主体可后续注册），团队希望先敲代码。
**Decision**: 第一版不依赖真实微信资质。把「激励视频广告」与「WiFi 连接」抽象成**可切换适配层**：开发期用 Mock 实现（模拟广告播放完成回调、模拟连接成功/失败），资质就绪后通过配置切换到真实微信 SDK 实现。微信 API 细节研究推迟到真机联调阶段。
**Consequences**: 可立即开发全链路而不被资质阻塞；代价是需多写一层接口与 Mock，但天然利于后续测试。

## Open Questions

* [Preference] 技术栈最终选型（我给出推荐，待用户拍板）。
* [Preference] 仓库结构：monorepo（小程序+后端+后台同仓）vs 多仓。
* [Preference] 监控后台「广告收益」是否接受「预估收益」（真实收益在微信流量主后台）。
* [Preference] 实时监控的「实时」程度（秒级 WebSocket vs 分钟级轮询）。
* [Preference] MVP 是否包含小程序端的「连接失败兜底/重试」与「外链跳转」全部细节。

## Requirements (evolving)

### 小程序端
* 微信登录获取 openid（code2session）。
* 店铺 CRUD（建/改/查），owner 权限校验。
* 生成携带 sid 的小程序码。
* 顾客扫码 → 门店页 → 激励视频 → 完成回调 → 一键连 WiFi → 密码兜底。
* 事件埋点上报：扫码 / 广告完成 / 连接点击 / 连接成功(失败)。

### 监控后台（平台运营方）
* 流量漏斗：扫码→广告完成→连接点击→连接成功 的转化与流失。
* 广告收益：曝光/完成次数 + （预估）收益。
* 店铺与趋势排行：店铺活跃排行、日活趋势、新增店铺数。
* 异常与实时监控：连接失败率、广告回调异常、实时扫码/在线告警。

### MVP 范围（已确认）
* 实时监控：分钟级轮询（非 WebSocket）。
* 广告收益：预估收益 = 广告完成数 × 可配置 eCPM 单价。
* 连接失败兜底：显示密码 + 重试，区分「调用失败」与「用户放弃」埋点。
* 外链跳转：存链接 + 跳转（不做外链点击统计）。
* **Logo 上传：做**（本地/对象存储均可，先本地静态目录）。
* **CSV 导出：做**（后台各报表支持导出）。

## Acceptance Criteria

* [x] 商家可创建/编辑店铺（owner 权限校验），上传 Logo，生成可扫描的小程序码。（e2e 验证：建店返回 sid，owner 视图含明文密码）
* [x] 顾客扫 sid 进入门店页，只能看到当前店铺；看完广告（完成回调）才解锁连接，未完成不可连。（e2e：未完成 unlock 返回 403，完成后下发密码）
* [x] 一键连接走适配层；失败时展示密码兜底并可重试。（wifi 页 connect_success/connect_fail 埋点 + 密码兜底 UI）
* [x] 全链路事件入库：scan / ad_complete / ad_skip / connect_click / connect_success / connect_fail。（events 接口 + 实时累加 DailyShopStat）
* [x] 运营后台展示四大模块：流量漏斗、（预估）广告收益、店铺与趋势排行、异常与实时监控。（6 接口 e2e 验证数据正确）
* [x] 后台各报表支持 CSV 导出。（export 接口返回带 BOM 的 CSV）
* [x] 广告与 WiFi 走可切换适配层，默认 Mock 实现，全链路在无微信资质下可跑通 + 有测试。（ADAPTER_MODE=mock，9 单测通过）

## 验证记录（2026-05-31）

* `pnpm -r typecheck`：shared / server / admin 全过。
* `pnpm --filter @q2w/server test`：9 passed。
* `pnpm --filter @q2w/admin build`：成功（仅 chunk 体积警告）。
* 真实 Postgres 端到端冒烟：登录 → 建店 → 公开视图无密码 → 埋点 → 广告 403/解锁 → 后台 overview/funnel/revenue/ranking/anomalies/export + 鉴权 401 全部符合预期。

## Technical Approach

### 共享类型 `/packages/shared`
事件枚举、事件 payload、API DTO、店铺模型一处定义，三端复用。

### 埋点事件分类（核心）
| event_type | 触发点 | 漏斗位置 |
|---|---|---|
| `scan` | 顾客扫码进入门店页 | 漏斗第 1 步 |
| `ad_start` | 激励视频开始 | — |
| `ad_complete` | 广告完成回调成功 | 漏斗第 2 步 |
| `ad_skip` | 广告跳过/未完成退出 | 异常/流失 |
| `connect_click` | 点击连接按钮 | 漏斗第 3 步 |
| `connect_success` | 适配层连接成功 | 漏斗第 4 步 |
| `connect_fail` | 适配层连接调用失败 | 连接失败率来源 |

漏斗定义：`scan → ad_complete → connect_click → connect_success`。

### 数据模型（PostgreSQL + Prisma）
* `User`(openid PK, created_at)
* `Shop`(id, sid 唯一, owner_openid FK, name, wifi_ssid, wifi_password 加密存储, logo_url, review_link, group_buy_link, phone, status, created_at, updated_at)
* `Event`(id, type, shop_id FK, actor_openid?, visitor_id, session_id, meta jsonb, created_at) — 大表，按 (shop_id, type, created_at) 建索引
* `DailyShopStat`(shop_id, date, scans, ad_completes, connect_clicks, connect_success, connect_fail) — 定时任务滚动汇总，供后台快速查询
* `Setting`(key, value) — 存 eCPM 单价等可配置项
* `AdminUser`(id, username, password_hash) — 运营后台账号（与小程序 openid 体系隔离）

### 适配层（默认 Mock，配置切真）
* `AdProvider`: `playRewardedAd() → {completed: boolean}`；实现 `MockAdProvider` / `WechatAdProvider`
* `WifiConnector`: `connect(ssid, password) → {ok, errorCode?}`；实现 `MockWifiConnector` / `WechatWifiConnector`
* `QrCodeProvider`: 生成携带 sid 的码；`MockQrCodeProvider`（占位图） / `WechatQrCodeProvider`(wxacode.getUnlimited)

### API 面（NestJS）
**小程序：** `POST /auth/login`(code→openid+JWT)、`GET/POST /shops`、`GET/PATCH /shops/:id`、`POST /shops/:id/logo`、`POST /shops/:id/qrcode`、`GET /connect/:sid`(公开，无密码)、`POST /connect/:sid/unlock`(广告完成后返回密码/连接令牌)、`POST /events`(批量上报)
**后台：** `POST /admin/auth/login`、`GET /admin/overview`、`GET /admin/funnel`、`GET /admin/revenue`、`GET /admin/shops/ranking`、`GET /admin/trends`、`GET /admin/anomalies`、`GET /admin/export`(CSV)

### 页面
* 小程序（原型 8 屏）：我的店铺首页 / 创建店铺 / 店铺详情管理 / 生成二维码 / 顾客门店页 / 广告页 / 连接页 / 单店数据页
* 运营后台：登录 / 总览 Dashboard / 漏斗分析 / 广告收益 / 店铺排行 / 趋势 / 异常监控 /（导出按钮内嵌各页）

### 安全
* WiFi 密码 AES 加密存储；仅广告解锁后经 `unlock` 接口下发。
* 顾客门店页 (`GET /connect/:sid`) 永不返回密码。
* 店铺编辑校验 `owner_openid == 当前 openid`。
* 后台账号体系与小程序 openid 完全隔离，独立 JWT。

## Implementation Plan（小步 PR）
* **PR1 脚手架**：pnpm monorepo + `packages/shared`(类型/事件枚举) + `apps/server` NestJS 骨架 + Prisma schema + 迁移 + Docker compose(PG/Redis)。
* **PR2 店铺与鉴权**：登录(Mock openid)、店铺 CRUD + owner 校验 + Logo 上传 + 二维码(Mock) + 单测。
* **PR3 顾客连接链路**：connect/:sid 公开页接口、unlock、AdProvider/WifiConnector Mock 适配层 + 单测。
* **PR4 埋点与汇总**：`POST /events` 批量上报、Event 入库、DailyShopStat 定时汇总任务。
* **PR5 运营后台后端**：admin 鉴权 + overview/funnel/revenue/ranking/trends/anomalies/export 接口 + 单测。
* **PR6 运营后台前端**：React + AntD Pro + ECharts，对接四大模块 + CSV 导出。
* **PR7 小程序前端**：原生小程序 8 屏，对接 API 与适配层。

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* 提现、分成、结算流水。
* 商家资质认证 / KYC。
* 多平台（支付宝/抖音）小程序。
* 真实广告收益精确对账（仅做预估）。

## Technical Notes

* 全新仓库；`.trellis/spec/{backend,frontend,guides}` 为空模板。
* 原型稿：`wifi扫码广告流程设计_v2.html`。
* 关键技术风险：
  1. 广告收益数据不在自有后端，需走微信流量主后台，本系统只能做预估。
  2. `wx.connectWifi` 在 iOS/Android 有兼容性限制，需区分「调用失败」与「用户未连」。
  3. 微信流量主开通有门槛（UV 等条件，需核实官方文档）。

## Research References

* (待补充)
