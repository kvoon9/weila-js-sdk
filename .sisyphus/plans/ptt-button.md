# PTT 录音按钮组件开发计划

## TL;DR

> **快速摘要**: 为 @weilasdk/ui 创建 PTT（按住说话）对讲按钮组件，支持按住说话、松开发送的交互模式

> **交付物**:
>
> - `WlPttButton.vue` 组件
> - Props 类型导出
> - Storybook 故事
> - 构建验证

> **预估工作量**: 短
> **并行执行**: 单任务，无需并行
> **关键路径**: 组件开发 → 导出 → Storybook → 验证

---

## Context

### 原始需求

用户需要在 Weila SDK Vue 组件库中添加一个 PTT 录音按钮，用于对讲场景。

### 访谈总结

**关键讨论**:

- 组件用途: PTT 对讲按钮（按住说话场景）
- 交互方式: 按住说话 (Press-to-talk)
- 视觉风格: 圆形主按钮
- 测试策略: 无需自动化测试

### 研究发现

- 现有组件模式: `Wl` 前缀 + Props 接口导出 + BEM/Tailwind 样式
- 可用图标: Carbon icons (`carbon--microphone`, `carbon--record`)
- 现有动画: CSS @keyframes (参考 WlAudioBubble)
- 构建工具: tsdown + unplugin-vue
- 测试: Vitest 已配置（本次不使用）

---

## Work Objectives

### 核心目标

创建可复用的 PTT 对讲按钮组件，集成到 @weilasdk/ui 组件库

### 具体交付物

- `packages/ui/src/components/PttButton/WlPttButton.vue`
- `packages/ui/src/index.ts` 导出更新
- `packages/ui/src/stories/WlPttButton.stories.ts`

### 完成定义

- [ ] 组件可正常导入使用
- [ ] 按住/释放交互正常工作
- [ ] 状态可视化正确显示
- [ ] Storybook 可预览
- [ ] 构建通过

### 必须有

- 按住开始录音、释放停止录音
- 三种状态: idle / recording / processing
- 禁用状态支持
- 响应式尺寸

### 禁止事项 (Guardrails)

- 不实现 SDK 调用逻辑（仅 emit 事件，由外部处理）
- 不添加自动化测试
- 不修改现有组件

---

## Verification Strategy

### 测试决策

- **测试基础设施**: 有 (Vitest + Vue Test Utils)
- **自动化测试**: 无（用户选择）
- **验证方式**: Agent-Executed QA（手动执行验证）

### QA 策略

每个任务必须包含 Agent-Executed QA Scenarios:

- 组件导入测试
- 状态切换测试
- 事件触发测试

---

## Execution Strategy

### 单任务流程

```
Task 1: 创建 PTT 按钮组件
├── 组件开发 (WlPttButton.vue)
├── 导出更新 (index.ts)
├── Storybook 故事
└── 验证构建

Critical Path: 组件 → 导出 → 验证
```

---

## TODOs

- [x] 1. 创建 WlPttButton 组件

  **What to do**:
  - 在 `packages/ui/src/components/PttButton/` 目录创建 `WlPttButton.vue`
  - Props: status (idle|recording|processing), disabled (boolean), size (sm|md|lg)
  - Events: start, stop, error
  - 交互: mousedown/touchstart 开始, mouseup/mouseleave/touchend 停止
  - 样式: 圆形按钮，录音时红色高亮 + 动画
  - 使用 Carbon icons: `carbon--microphone`, `carbon--record`

  **Must NOT do**:
  - 不调用 SDK 方法（weila_requestTalk）
  - 不处理业务逻辑，仅 emit 事件
  - 不添加测试文件

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 组件开发，需要动画和交互处理
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - N/A

  **Parallelization**:
  - **Can Run In Parallel**: N/A (单任务)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `packages/ui/src/components/Message/WlAudioBubble.vue:50-60` - Carbon icon 使用示例
  - `packages/ui/src/components/WlStatusIndicator.vue:50-70` - 动画实现参考
  - `packages/ui/src/style.postcss.css` - Tailwind 配置

  **Acceptance Criteria**:
  - [ ] 组件文件创建成功
  - [ ] Props 类型正确导出
  - [ ] `pnpm --filter @weilasdk/ui run build` 通过

  **QA Scenarios**:

  ```
  Scenario: 组件导入测试
    Tool: Bash
    Preconditions: 构建产物存在
    Steps:
      1. 执行 pnpm --filter @weilasdk/ui run build
      2. 检查 dist/ 输出
    Expected Result: 构建成功，产物包含组件
    Evidence: .sisyphus/evidence/ptt-button-build.log

  Scenario: 状态切换验证
    Tool: Bash (grep)
    Preconditions: 组件代码存在
    Steps:
      1. 检查组件包含 idle/recording/processing 三种状态
      2. 检查 mousedown/mouseup 事件处理
    Expected Result: 状态和事件处理代码存在
    Evidence: .sisyphus/evidence/ptt-button-status-check.txt

  Scenario: 图标验证
    Tool: Bash (grep)
    Preconditions: 组件代码存在
    Steps:
      1. grep "carbon--microphone"
      2. grep "carbon--record"
    Expected Result: Carbon 图标 class 存在
    Evidence: .sisyphus/evidence/ptt-button-icons.txt
  ```

  **Commit**: YES
  - Message: `feat(ui): add WlPttButton component`
  - Files: `packages/ui/src/components/PttButton/`, `packages/ui/src/index.ts`
  - Pre-commit: None

- [x] 2. 添加 Storybook 故事

  **What to do**:
  - 创建 `packages/ui/src/stories/WlPttButton.stories.ts`
  - 展示不同状态 (idle, recording, processing, disabled)
  - 可选: 交互式预览

  **Must NOT do**:
  - 不添加自动化测试

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Story 文件模板化，复杂度低

  **Parallelization**:
  - **Can Run In Parallel**: YES (独立于组件开发)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:
  - `packages/ui/src/stories/WlAudioBubble.stories.ts` - 故事模板参考

  **Acceptance Criteria**:
  - [ ] 故事文件创建成功
  - [ ] 可通过 Storybook 预览

  **QA Scenarios**:

  ```
  Scenario: Storybook 构建测试
    Tool: Bash
    Preconditions: 故事文件存在
    Steps:
      1. pnpm --filter @weilasdk/ui run build:story
    Expected Result: 构建成功
    Evidence: .sisyphus/evidence/ptt-button-storybook.log
  ```

  **Commit**: YES (与 Task 1 合并)
  - Message: `feat(ui): add WlPttButton stories`
  - Files: `packages/ui/src/stories/WlPttButton.stories.ts`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
      读取计划，对比实际产出:
  - WlPttButton.vue 存在
  - index.ts 导出存在
  - Stories 文件存在
  - 构建通过
    Output: `Must Have [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Build Verification** — `quick`
      执行完整构建验证:
  - pnpm --filter @weilasdk/ui run build
  - pnpm --filter @weilasdk/ui run typecheck
    Output: `Build [PASS/FAIL] | Typecheck [PASS/FAIL] | VERDICT`

---

## Commit Strategy

- **1**: `feat(ui): add WlPttButton component` — WlPttButton.vue, index.ts, \*.stories.ts

---

## Success Criteria

### Verification Commands

```bash
pnpm --filter @weilasdk/ui run build  # 成功
pnpm --filter @weilasdk/ui run typecheck  # 成功
```

### Final Checklist

- [ ] WlPttButton 组件已创建
- [ ] Props 类型已导出
- [ ] Storybook 故事已添加
- [ ] 构建通过
- [ ] 类型检查通过
