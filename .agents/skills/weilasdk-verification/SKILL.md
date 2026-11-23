---
name: weilasdk-verification
description: |
  微喇 SDK 的验证技能：四层验证体系（单元/契约测试、形式化模型检查、真实后端集成测试、
  门禁预算）。重构 FSM（weila_fsmScript.ts / weila_pttFsm.ts）、proto 层或核心流程前后必须运行；
  新增状态机状态、事件或转换时必须同步扩展形式化模型检查的属性；状态机运行时/actor 事件语义
  变更与大范围 codemod 合并必须独立 diff 审计。
---

# 微喇 SDK 验证技能

## 何时使用

- 修改 `packages/core/src/fsm/`（两台状态机）的任何状态、事件、转移之前与之后
- 修改 `packages/core/src/proto/`（protobuf 构造/编码）之前与之后
- 修改登录、消息收发、PTT、网络 worker 等核心流程
- 评审 SDK 改动时确认验证覆盖
- 状态机运行时/actor 事件语义变更、大范围 codemod、两个带意图分支的合并：**无论出自哪个流程/阶段，一律独立 diff 审计**（审计强度按风险定，不按阶段出身——XState 5 双机迁移这种最高风险变更曾只靠自查过关）

## 四层验证体系

### 第 1 层：单元与契约测试（毫秒级）

```bash
pnpm -C packages/core exec vitest run
```

- `weila_fsm.spec.ts` — 状态机行为转移（14 条，stub 驱动）
- `weila_fsm_model.spec.ts` — **形式化模型检查**（见第 2 层）
- `weilapb_contract.spec.ts` — golden wire vectors，登录/建群/文本消息的**字节级**对比，proto 层任何改动的红线
- `weilapb_builders.spec.ts` — 全部 90 个请求构造器的帧级回归（帧头 service/command/length + payload 解码回验 + 路由容器置位；覆盖守卫从 wrapper 对象运行时导出，新构造器无用例即失败）。**绿 = 仅构造级证明**，不等于功能端到端可用（反例：建群 builder 全绿但服务端 CONTENT_AUDIT_BLOCK 拦截）
- `weila_*_module.spec.ts` — 各域模块（login/group/session/friend/business/user/location）响应路由守卫（含"缺 case 必须静默"契约，防 token 刷新类 bug 复发）
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
- **校准义务**：新写或修改探索器后，首跑输出可疑时先怀疑检查器自身；信任其"绿"之前必须播种已知缺陷（错拼事件常量、不可达状态）确认属性会红——把检查器自己调到全绿不证明目标无错

**新增状态/事件时的义务**：把状态名加进对应 `declared` 列表，事件常量加进 `MAIN_EVENT_NAMES`/`PTT_EVENT_NAMES`，否则属性 2/4 不会覆盖新增面。

### 第 3 层：真实后端集成测试（`tests/integration/`）

```bash
pnpm -C packages/core test:integration
```

加载 `dist/weilasdk.mjs` 直连生产 WSS，无凭据自动 skip。覆盖登录/消息/收发/位置/会话设置/PTT。

**凭据与账号**（`.env.integration` 是测试基础设施，不是 tmp）：

- 文件 gitignored，`git worktree add` 不会带过去：每个新 worktree 先拷贝（mode 600）再跑门禁/集成；清理 worktree 时**排除**它（曾在清理中丢失，恢复花了 ~40 次调用还把凭据哈希回显进了 transcript）
- 丢失时从 `/tmp/regen-env.json` 重建，或经 weila-work 控制台 v2 登录重新捕获；恢复凭据**只写文件，不在对话里回显**
- SDK 密码 ≠ 网页密码：控制台发 MD5(网页密码) 登录，响应 `data.account.password` 才是 SDK 要的哈希（`weila_login(..., { md5: false })`）；网页能登 ≠ SDK 能登
- 新建测试账号必须是**部门管理员**（普通成员 45019 被拒，SDK 密码在被拒之前拿不到）
- 外部系统的账号/数据变动记入审计轨迹，收尾时可对账

**PTT 采集**：

- 无头可测：Chromium 以 `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required` 启动，`coreAudio.talk(<ms>, sessionId, sessionType)` 驱动，断言 `frameCount >= 25`
- 保留 `canCaptureAudio()` 自检：真 TCC 拒绝（无假设备路径）时自跳并说明原因

### 第 4 层：门禁与预算（CI `gates` job）

```bash
pnpm run typecheck && pnpm run typecheck:tsc   # tsrs 主门 + tsc 交叉验证
pnpm run lint                                   # per-file lint 预算棘轮（只降不升）
pnpm run typecheck:strict-budget                # strict 诊断 + suppression 棘轮
pnpm run knip                                   # 未使用导出/依赖清零
pnpm run fmt:check
```

门禁判读与预算规则：

- **门禁只认工具自身退出码**（或机器可读 reporter）；经 `grep`/`tail` 管道的门禁不是门禁——管道吞失败码、滤掉大小写不符的输出（knip "Unused exports" 本地假绿、CI 抓回的教训）。裸跑并读 `$?`
- `lint`/`strict-budget` 是对照 `packages/core/artifacts/*-budget.json` 的棘轮脚本，`--write` 重定基线；要看真实诊断直接跑 `pnpm exec oxlint --type-aware <file>` / `tsc --noEmit --strict`
- 预算 JSON 是 rebase 冲突热点：冲突时取 `origin/main` 副本 → `git add` → `rebase --continue` → 重跑 `--write` 再提交
- 多批次并行改预算文件：**编辑可并行、落地必须串行**——每个后续 PR 在新 main 上重放棘轮算术再开

## 验证红线（任何 PR 合并前）

1. 四层全绿
2. proto 改动：golden vectors 字节不变（除非协议本身就是本次改动对象并在 PR 说明）；`bash buildjs.sh` 再生成必须以空 `git diff` 结束（脚本保持 LF——CRLF 会静默击穿 `set -e`）
3. FSM 改动：模型检查的四个属性仍然成立，`declared`/`*_EVENT_NAMES` 与配置同步
4. 行为差异（哪怕看似更优）必须在 PR 正文披露，不许悄悄改语义
5. 删除代码的标准：**即使将来被外部调用也永远跑不通**才可删；"今天没有调用方"不构成删除理由（已发布 npm 包，功能完备性优先）——删除前先测试，跑不通先修。注意 builders spec 绿只是构造级证明，协议面删除决策还需真后端探测或用户明示
6. **验证产出的修复本身是新代码**：每轮修复后重新独立复核，直到出现一轮零发现才算干净（守卫修复曾连环引入新缺陷，三轮才收敛）
7. **两个带意图的分支（codemod/重构批次）解冲突后，必须独立逐行复核双方验收标准**——零冲突标记 + 门禁全绿只证明文本合并，不证明意图存活（自动合并曾静默把 9 处 proto 边界调用降级为无类型、丢 8 个枚举导入而门禁照绿）
8. **knip 不追踪 wrapper 对象方法注册**：其对注册面上的 unused 判定只是线索，永不构成删除令（32 个 builder 误删的根因）

## 已知限制（记录在案，勿重复踩坑）

- xstate 5.33 `machine.transition` 独立使用抛 `actionExecutor` undefined —— 不要再试，直接用重放式探索；v4 `interpret` 扩展（withContext/withConfig/onTransition/send）运行时已全删，别再写兼容 shim；完成事件字段是 `output`/`error` 不是 `data`
- `settle()` 需要两轮 `setTimeout(0)` 让 fromPromise 链条完成
- 集成测试同账号快速重登会被服务端踢（偶发 DB 空引用），`CoreSession.close` 已做确定性 logout 等待，勿移除
- 探索器刻意用递归代替循环内 await（repo 的 lint 预算对 no-await-in-loop 只减不增）
- **服务端策略拒绝**（写测试前先认得它们）：跨企业发消息 `RESULT_REQUEST_LIMITED`(22)、SDK 建群 `RESULT_CONTENT_AUDIT_BLOCK`(42)、收到的语音是 CDN URL 且 frameCount=0——按可观察结果断言，不写永远红的测试；协议语义先查 `/Users/kvoon/weila/vois-app-webview-next` 的安卓/iOS 逆向笔记再问用户
