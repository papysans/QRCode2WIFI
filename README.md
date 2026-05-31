<div align="center">

# QRCode2WIFI

**WiFi 扫码广告小程序 + 平台运营监控后台**

商家建店配置 WiFi、生成专属小程序码；顾客扫码看完激励视频后一键连 WiFi。
配套 Web 运营后台：流量漏斗 · 预估广告收益 · 店铺趋势排行 · 异常实时监控。

`微信原生小程序` · `NestJS` · `Prisma` · `PostgreSQL` · `React` · `Ant Design` · `ECharts`

</div>

---

> **当前状态**：MVP 全链路打通，默认 `ADAPTER_MODE=mock`，**无需微信资质即可本地跑通商家端 / 顾客端 / 运营后台全流程**。
> 第一版目标是验证使用量，暂不做提现 / 分成 / 商家认证。接入真实微信的清单见文末「从 Mock 到生产」。

## ✨ 功能特性

- **一个微信身份，两个入口**：自己打开小程序 = 管理「我的店铺」；扫码 = 连接当前店铺 WiFi。
- **商家端**：微信登录即用，创建店铺、配置 WiFi、上传 Logo、生成携带 `sid` 的小程序码、查看单店数据。
- **顾客端**：扫码进当前门店 → 看完激励视频（完成回调才解锁）→ 一键连 WiFi → 失败密码兜底。
- **运营监控后台**：总览 KPI、流量漏斗、（预估）广告收益、店铺活跃排行、日活趋势、连接失败率告警 + 分钟级实时扫码，全部支持 CSV 导出。
- **可切换适配层**：广告 / WiFi 连接 / 二维码生成均为接口，`mock` 与 `wechat` 两套实现，一个环境变量切换。
- **安全**：WiFi 密码 AES-256-GCM 加密存储，仅广告解锁后下发；顾客公开视图永不含密码；店铺编辑校验 owner；后台账号与小程序身份隔离。

## 🏗 架构

```
┌──────────────┐  扫码/广告/连接 事件上报   ┌─────────────────────┐
│  微信小程序    │ ─────────────────────────▶ │  后端 API (NestJS)   │
│ 商家端 + 顾客端 │  code2session 登录         │  auth/shops/connect  │
└──────────────┘                            │  events/admin/stats  │
                                            └──────────┬───────────┘
                          ┌──────────────────┬─────────┴──────────┐
                          ▼                  ▼                    ▼
                  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
                  │ PostgreSQL    │   │ 适配层 mock|  │   │ 运营监控后台      │
                  │ Shop/Event/   │   │ wechat       │   │ React+AntD+ECharts│
                  │ DailyShopStat │   │ ad/wifi/qr   │   └──────────────────┘
                  └──────────────┘   └──────────────┘
```

### Monorepo 结构（pnpm workspaces）

```
QRCode2WIFI/
├─ packages/shared/      三端共享类型：事件枚举(漏斗) / 店铺模型 / API 契约
├─ apps/server/          NestJS + Prisma + PostgreSQL 后端
│  ├─ src/auth           微信登录 (code→openid) + JWT
│  ├─ src/shops          店铺 CRUD / owner 校验 / Logo / 二维码 / 单店统计
│  ├─ src/connect        顾客公开门店页 + 广告解锁下发密码
│  ├─ src/events         批量埋点入库 + 实时累加日汇总
│  ├─ src/admin          后台鉴权 + 四大模块分析 + CSV 导出
│  ├─ src/stats          Cron 对账汇总
│  └─ src/adapters       ad / wifi / qrcode 的 mock & wechat 实现
├─ apps/admin/           运营监控后台 (Vite + React + AntD + ECharts)
└─ apps/miniprogram/     微信原生小程序（8 屏：商家 4 + 顾客 3 + 数据 1）
```

## 🧱 数据模型

| 表 | 说明 |
|---|---|
| `User` | 微信用户（openid 主键，创建店铺后即 owner） |
| `Shop` | 店铺；`sid` 唯一短码、`wifiPassword` 加密存储 |
| `Event` | 埋点大表：scan / ad_complete / ad_skip / connect_click / connect_success / connect_fail |
| `DailyShopStat` | 按店按天汇总，供后台快速查询（实时累加 + Cron 对账） |
| `Setting` | 可配置项（如 eCPM 单价） |
| `AdminUser` | 运营后台账号，与小程序 openid 体系隔离 |

**漏斗定义**：`scan → ad_complete → connect_click → connect_success`

## 🚀 本地启动

前置：Node ≥ 18、pnpm ≥ 9、Docker。

```bash
# 1. 安装依赖
pnpm install

# 2. 起 PostgreSQL / Redis
docker compose up -d

# 3. 后端
cd apps/server
cp .env.example .env
pnpm prisma:generate
pnpm prisma:migrate --name init
pnpm seed                 # 创建 admin/admin123 + 演示店铺 sid=Ab8K29
pnpm start:dev            # http://localhost:3000/api

# 4. 运营后台
cd ../admin
pnpm dev                  # http://localhost:5173  （登录 admin / admin123）

# 5. 小程序
#    用「微信开发者工具」导入 apps/miniprogram 目录，AppID 选「测试号」
#    详情 → 本地设置 → 勾选「不校验合法域名…」
```

### 模拟顾客扫码（开发者工具）

普通编译下拉 → 添加编译模式：
- 启动页面：`pages/connect/index`
- 启动参数：`sid=Ab8K29`

编译后即进入门店页，走完广告→解锁→连接，后台漏斗即出数。

## 📡 主要 API

| 端 | 方法 路径 | 说明 |
|---|---|---|
| 小程序 | `POST /api/auth/login` | code→openid+JWT（mock 模式 code 即 openid） |
| 小程序 | `GET/POST /api/shops` | 我的店铺列表 / 创建 |
| 小程序 | `GET/PATCH /api/shops/:id` | 详情 / 编辑（owner 校验） |
| 小程序 | `GET /api/shops/:id/stats` | 单店累计数据 |
| 小程序 | `POST /api/shops/:id/logo` | 上传 Logo |
| 小程序 | `POST /api/shops/:id/qrcode` | 生成小程序码 |
| 顾客 | `GET /api/connect/:sid` | 公开门店页（**无密码**） |
| 顾客 | `POST /api/connect/:sid/unlock` | 广告完成后下发 WiFi 密码 |
| 埋点 | `POST /api/events` | 批量事件上报 |
| 后台 | `POST /api/admin/auth/login` | 运营登录 |
| 后台 | `GET /api/admin/{overview,funnel,revenue,shops/ranking,trends,anomalies}` | 四大模块数据 |
| 后台 | `GET /api/admin/export?type=...` | CSV 导出 |

## ✅ 测试

```bash
pnpm -r typecheck                    # shared / server / admin
pnpm --filter @q2w/server test       # 后端单测
pnpm --filter @q2w/admin build       # 后台生产构建
```

## 🔌 从 Mock 到生产（接入真实微信）

| 步骤 | 内容 |
|---|---|
| **A. 平台准备** | 注册企业主体小程序拿 AppID/Secret；补 WiFi/工具类目；开通流量主+激励视频广告位拿 adUnitId；配置 HTTPS 服务器域名白名单（需 ICP 备案） |
| **B. 后端** | 填 `auth.service.resolveOpenid`（code2session）、`wechat.adapters.ts`（wxacode.getUnlimited + 激励视频服务端回调验签）、access_token 缓存；`.env` 设 `ADAPTER_MODE=wechat` |
| **C. 小程序** | `utils/adapters.js` 设 `MODE='wechat'` + adUnitId；`app.js` 的 `apiBase` 改 HTTPS 域名 |
| **D. 部署** | 后端 Docker + Nginx + 证书 + 云 PostgreSQL；后台静态托管；小程序上传审核发布 |

> ⚠️ 流量主开通门槛、类目审核要求、`wx.connectWifi` 平台限制会随微信政策变化，接入前请以微信公众平台/官方文档当时的要求为准。广告真实收益以微信流量主后台结算为准，本系统仅做预估（eCPM 可配）。

## 📌 路线图

- [x] MVP 全链路（Mock）：商家端 / 顾客端 / 运营后台
- [ ] 接入真实微信资质（code2session / 小程序码 / 激励视频 / connectWifi）
- [ ] 真机多机型连接成功率验证
- [ ] 商家自助数据后台
- [ ] 广告分成 / 提现结算

## 📄 License

待定（建议上传前明确 LICENSE）。
