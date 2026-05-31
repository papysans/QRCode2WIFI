# Journal - Napstablook (Part 1)

> AI development session journal
> Started: 2026-05-31

---

## 2026-05-31 — 任务 05-31-wifi：WiFi 扫码广告小程序 + 运营监控后台（1-shot）

**完成**：从零搭起 pnpm monorepo，四个包全部落地并验证：
- `packages/shared`：三端共享类型（EventType 漏斗、Shop 模型、API 契约）。
- `apps/server` (NestJS+Prisma+PG)：auth/shops/connect/events/admin/stats 六模块；可切换适配层（ad/wifi/qrcode 的 mock|wechat 实现）；WiFi 密码 AES-256-GCM 加密、广告解锁后才下发；DailyShopStat 实时累加 + Cron 对账。
- `apps/admin` (React+AntD+ECharts)：登录 + 总览/漏斗/收益/排行/趋势/异常 6 页 + CSV 导出。
- `apps/miniprogram`：原生小程序 8 屏（商家 4 + 顾客 3 + 单店数据 1），含客户端埋点与广告/WiFi 适配。

**验证**：全量 typecheck 通过；server 9 单测通过；admin 生产构建成功；真实 Postgres 端到端冒烟全链路通过（建店→无密码公开视图→埋点→广告 403/解锁→后台四大模块→鉴权 401→CSV）。

**关键决策**：无微信资质，默认 `ADAPTER_MODE=mock` 全链路可跑；资质就绪后填 `wechat.adapters.ts` 并切换。真实广告收益走流量主后台，本系统只做预估（eCPM 可配）。

**后续**：接微信 code2session / wxacode.getUnlimited / 激励视频验签；admin 端口默认 5173 与本机 dystore-web 冲突，需改端口。



## Session 1: WiFi扫码广告小程序+运营监控后台+真实微信适配+Trellis介绍

**Date**: 2026-05-31
**Task**: WiFi扫码广告小程序+运营监控后台+真实微信适配+Trellis介绍
**Branch**: `main`

### Summary

全栈 monorepo MVP（小程序8屏+NestJS后端+React监控后台），可切换适配层默认mock全链路跑通；真实微信适配层(code2session/getUnlimited/激励视频回调防伪)；39后端+5前端测试；trellis-check抓出运行时DI崩溃；知识沉淀进backend/quality-guidelines与guides；另产出小程序浏览器预览与Trellis×CSC介绍页。

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `2fe1012` | (see git log) |
| `5d261a6` | (see git log) |
| `117984e` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
