# Quality Guidelines

> Code quality standards for backend development (NestJS + Prisma).
> Captured from the WiFi 扫码广告 (05-31-wifi) task.

---

## Forbidden Patterns

### Don't: Nest provider 构造函数带「不可注入」的参数（哪怕有默认值）

**Problem**:
```typescript
// ❌ 为了测试可注入假 fetch/时钟，给 provider 加了对象参数
interface WechatTokenDeps { fetchFn?: typeof fetch; now?: () => number }
@Injectable()
export class WechatTokenService {
  constructor(private readonly deps: WechatTokenDeps = {}) {} // ← 元数据 design:paramtypes=[Object]
}
// 该类被列入某 @Module 的 providers
```

**Why it's bad**: 即使参数有默认值，TS 仍发出 `design:paramtypes=[Object]`。Nest bootstrap 时会实例化模块内**所有** provider，遇到无法解析的 `Object` 类型参数直接抛
`Nest can't resolve dependencies of the XxxService (?)` 并**启动崩溃**。
致命点：单测里 `new XxxService(fakeDeps)` 手动构造**绕过了 DI**，测试全绿、运行时却挂——typecheck + 单测都发现不了。

**Instead**: 把「测试种子」做成可重写的 protected 属性，构造函数无参（或仅注入真正的 Nest provider）：
```typescript
// ✅ 生产 DI 零额外依赖；测试用子类覆写
@Injectable()
export class WechatTokenService {
  protected fetchFn = (...a: Parameters<typeof fetch>) => fetch(...a);
  protected now = () => Date.now();
}
// 测试：
class TestWechatTokenService extends WechatTokenService {
  constructor(public f: typeof fetch, public n: () => number) { super(); this.fetchFn = f as any; this.now = n; }
}
```

**Prevention**: 见 `guides/cross-layer-thinking-guide.md` 的「改 DI/模块后必须 boot-smoke」——单测不覆盖 Nest 容器解析。

---

## Required Patterns

### Pattern: 可切换适配层（外部集成的 mock|real 抽象）

**Problem**: 第三方能力（微信广告 / WiFi 连接 / 小程序码）需要资质，开发期无法联调，但又不能让业务代码到处 `if (mock)`。

**Solution**: 每个外部能力定义一个接口 + `Symbol` DI token，提供 `Mock*` 与 `Wechat*` 两套实现，由 `AdaptersModule` 按 `ADAPTER_MODE` 环境变量在 provider 装配时选择 `useClass`。**默认 `mock`，使全链路在无资质下可跑通 + 可测试。**

**Signatures / Contract**:
```typescript
export const AD_PROVIDER = Symbol('AD_PROVIDER');     // + WIFI_CONNECTOR / QRCODE_PROVIDER
export interface AdProvider { verifyAdToken(t: string): Promise<{completed: boolean; adToken: string}>; }
// adapters.module.ts
const useWechat = () => process.env.ADAPTER_MODE === 'wechat';
{ provide: AD_PROVIDER, useClass: useWechat() ? WechatAdProvider : MockAdProvider }
```

**Env keys**: `ADAPTER_MODE=mock|wechat`（默认 mock）。real 模式另需 `WX_APPID/WX_SECRET/AD_UNIT_ID/WX_AD_CALLBACK_TOKEN`（见 `.env.example`）。

**Why**: 业务代码只依赖接口（构造注入 token），切换实现零改动；新人/CI 默认 mock 即可端到端跑。

### Convention: 敏感凭据加密存储 + 仅在「门槛动作」后下发

**What**: WiFi 密码（及同类秘密）用 AES-256-GCM 加密入库（`crypto.util.ts`），**顾客公开视图永不含密码**；只有在广告完成（`AdProvider.verifyAdToken` 通过、防重放）后，经 `POST /connect/:sid/unlock` 解密下发。

**Validation & Error Matrix**:
| 条件 | 行为 |
|---|---|
| `GET /connect/:sid`（公开） | 返回 `PublicShopView`，**无 wifiPassword 字段** |
| unlock 时广告未完成 | `403 ForbiddenException('广告未完成')` |
| unlock 时 sid 不存在 / 店铺下架 | `404` / `403` |
| adToken 重复使用 | 拒绝（`AdCompletionStore` 消费即失效，防重放） |

**Why**: 二维码只带 `sid` 不带密码；密码是"看广告"的奖励，必须服务端门控，不能信客户端自报完成。

---

## Testing Requirements

- 纯逻辑（加密往返、CSV、漏斗 rate、缓存过期、防重放、权限校验）必须有 jest 单测，用手动 Prisma mock（参考 `connect.service.spec.ts` 的 `{ shop: { findUnique: jest.fn() } }` 模式），不连真库。
- **DI / 模块装配变更后，单测之外还要 boot-smoke**（`node dist/main.js` 看到 `Nest application successfully started` + 一个真实接口 200/201），否则会漏掉运行时 DI 崩溃。

---

## Code Review Checklist

- [ ] 新 provider 的构造参数都能被 Nest 解析（无裸 `Object`/函数/基本类型参数）
- [ ] 外部集成是否走了适配层接口 + Symbol token，而非散落的 mock 分支
- [ ] 秘密是否加密入库、公开视图是否泄露、是否有门控解锁
- [ ] 改了 DI/模块后是否做了 boot-smoke（不只是 typecheck + 单测）
