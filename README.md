# Weila JS SDK Monorepo

`@vois/weila-sdk-core`（TypeScript SDK）和 `@vois/weila-sdk-ui`（Vue 3 组件库）的 monorepo。pnpm workspace + Turborepo。

## 常用命令

```bash
pnpm install
pnpm run build          # 构建全部包
pnpm run dev            # playground + 包 watch
pnpm run typecheck      # tsrs --noEmit --fast
pnpm run lint           # oxlint（预算见 packages/core/artifacts/lint-budget.json）
pnpm run fmt            # oxfmt
pnpm run test:run       # vitest
pnpm run api:snapshot   # tsnapi 公开 API 快照比对
pnpm knip
```

CI gate 见 `.github/workflows/gates.yml`。

## 包

| 包                     | 说明                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `@vois/weila-sdk-core` | WebSocket 组网、Opus 音频（WASM）、Protobuf 消息、IndexedDB 存储。Rspack 构建，ESM-only，面向浏览器。 |
| `@vois/weila-sdk-ui`   | Vue 3 组件库，tsdown 构建，双格式（ESM + CJS）。Storybook 文档在 `pnpm run story`。                   |
| `playgrounds/vue3`     | 开发用 playground，Vite 6。                                                                           |

core 的接入文档见 `packages/core/SDK_USAGE_DOC.md`。ui 的说明见 `packages/ui/README.md`。

## 开发约定

- 配置全部用 TypeScript：`oxlint.config.ts`、`oxfmt.config.ts`、`packages/core/rspack.config.mts`。
- Node ≥ 22.18（TS 配置依赖 Node 内置类型剥离）。
- 公开 API 有 tsnapi 快照（`packages/core/__snapshots__/tsnapi/`），改动导出前先跑 `pnpm run api:snapshot` 看差异，更新用 `pnpm run api:snapshot:update`。
- 代理规则（开发环境 vite proxy 需要）见 `packages/core/SDK_USAGE_DOC.md` 的代理一节。

## 预览包

每个 PR 和 `main` 分支的最新提交都会通过 [pkg.pr.new](https://github.com/stackblitz-labs/pkg.pr.new) 发布预览包，无需等待正式发版。工作流会在 PR 中评论当前提交的安装命令，也可以按下面的格式手动安装：

```bash
pnpm add --config.block-exotic-subdeps=false \
  https://pkg.pr.new/kvoon9/weila-js-sdk/@vois/weila-sdk-core@<PR 编号或 commit SHA> \
  https://pkg.pr.new/kvoon9/weila-js-sdk/@vois/weila-sdk-ui@<PR 编号或 commit SHA>
```

pnpm 11 起默认禁止 URL 形式的传递依赖。UI 预览包依赖同一提交的 core 预览包，所以安装时需要 `--config.block-exotic-subdeps=false`，这个参数只对当前命令生效。预览包的版本号是 `0.0.0-preview-<sha>`，不会与 npm 上的正式版本冲突。

仓库管理员需要先在仓库上安装 [pkg.pr.new GitHub App](https://github.com/apps/pkg-pr-new)，预览发布才会生效。
