---
name: weilasdk-verification
description: |
  微喇 SDK 的验证技能：四层验证体系（单元/契约测试、形式化模型检查、真实后端集成测试、
  门禁预算）。重构 FSM（weila_fsmScript.ts / weila_pttFsm.ts）、proto 层或核心流程前后必须运行；
  新增状态机状态、事件或转换时必须同步扩展形式化模型检查的属性。
---

# 微喇 SDK 验证技能

## 何时使用

- 修改 `packages/core/src/fsm/`（两台状态机）的任何状态、事件、转移之前与之后
- 修改 `packages/core/src/proto/`（protobuf 构造/编码）之前与之后
- 修改登录、消息收发、PTT、网络 worker 等核心流程
- 评审 SDK 改动时确认验证覆盖

## 四层验证体系

### 第 1 层：单元与契约测试（毫秒级）

```bash
pnpm -C packages/core exec vitest run
```

- `weila_fsm.spec.ts` — 状态机行为转移（14 条，stub 驱动）
- `weila_fsm_model.spec.ts` — **形式化模型检查**（见第 2 层）
- `weilapb_contract.spec.ts` — golden wire vectors，登录/建群/文本消息的**字节级**对比，proto 层任何改动的红线
- `weilapb_builders.spec.ts` — 全部 90 个请求构造器的帧级回归（帧头 service/command/length + payload 解码回验 + 路由容器置位；覆盖守卫从 wrapper 对象运行时导出，新构造器无用例即失败）
- `weila_login_module.spec.ts` — 响应路由（含"缺 case 必须静默"契约，防 token 刷新类 bug 复发）
- `weila_network.worker.spec.ts` — worker 发送队列（jsdom + 假 WebSocket）
- 其余：utils / db / ringbuffer

### 第 2 层：形式化模型检查（`weila_fsm_model.spec.ts`）

对两台状态机做**穷举状态空间探索**，机器验证四条结构安全属性：

1. **良构性** — 任何可达状态 × 任何声明事件的重放都不抛异常（所有转移目标真实存在）
2. **无死状态** — 配置里声明的每个状态节点都从初态可达
3. **无陷阱** — 除设计上的终态（`exception`/`uninit`），每个可达状态都能回到归宿态（main→`inited`，PTT→`idle`）
4. **事件处理完备** — 拥有方发送的每个事件常量在空间中某处真实产生状态变化或触发动作（无拼错/孤儿常量）

实现要点（改动时保持这些不变量）：

- xstate 5.33 的纯 `machine.transition` 不可用（action 需要运行时 scope，首个 action 即抛错），探索器用**重放式 BFS**：每个节点把事件序列重放进全新 stub actor
- 快照记录**双层**：send 后立即（invoke 挂起态）+ settle 后（actor 完成态），否则穿过型状态会丢失
- 两个变体（全部 actor resolve / 全部 reject）合并探索，覆盖 onDone/onError 两类分支
- "已处理"判定 = 状态变化 **或** 命名 action 触发（纯转移无 action，必须两者取或）
- 定时转移（`after` 延迟）不在探索范围内，由行为 spec 与集成测试覆盖

**新增状态/事件时的义务**：把状态名加进对应 `declared` 列表，事件常量加进 `MAIN_EVENT_NAMES`/`PTT_EVENT_NAMES`，否则属性 2/4 不会覆盖新增面。

### 第 3 层：真实后端集成测试（`tests/integration/`）

```bash
pnpm -C packages/core test:integration
```

加载 `dist/weilasdk.mjs` 直连生产 WSS，凭据在 gitignored 的 `.env.integration`（丢失时从 `/tmp/regen-env.json` 重建，或经 weila-work 控制台 v2 登录响应重新捕获）。无凭据自动 skip。覆盖登录/消息/收发/位置/会话设置/PTT（PTT 需可用麦克风，macOS TCC 拦截时自检 skip 并说明原因）。

### 第 4 层：门禁与预算（CI `gates` job）

```bash
pnpm run typecheck && pnpm run typecheck:tsc   # tsrs 主门 + tsc 交叉验证
pnpm run lint                                   # per-file lint 预算棘轮（只降不升）
pnpm run typecheck:strict-budget                # strict 诊断 + suppression 棘轮
pnpm run knip                                   # 未使用导出/依赖清零
pnpm run fmt:check
```

## 验证红线（任何 PR 合并前）

1. 四层全绿
2. proto 改动：golden vectors 字节不变（除非协议本身就是本次改动对象并在 PR 说明）
3. FSM 改动：模型检查的四个属性仍然成立，`declared`/`*_EVENT_NAMES` 与配置同步
4. 行为差异（哪怕看似更优）必须在 PR 正文披露，不许悄悄改语义
5. 删除代码的标准：**即使将来被外部调用也永远跑不通**才可删；"今天没有调用方"不构成删除理由（已发布 npm 包，功能完备性优先）——删除前先测试，跑不通先修

## 已知限制（记录在案，勿重复踩坑）

- xstate 5.33 `machine.transition` 独立使用抛 `actionExecutor` undefined —— 不要再试，直接用重放式探索
- `settle()` 需要两轮 `setTimeout(0)` 让 fromPromise 链条完成
- 集成测试同账号快速重登会被服务端踢（偶发 DB 空引用），`CoreSession.close` 已做确定性 logout 等待，勿移除
- 探索器刻意用递归代替循环内 await（repo 的 lint 预算对 no-await-in-loop 只减不增）
