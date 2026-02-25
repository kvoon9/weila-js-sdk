# @weilasdk/ui

集成了 Weila SDK 的 Vue 3 组件库。

## 构建工具

使用 [tsdown](https://tsdown.dev/) 构建，配合 [unplugin-vue](https://github.com/unplugin/unplugin-vue) 编译 `.vue` 单文件组件，通过 [rolldown-plugin-dts](https://github.com/sxzz/rolldown-plugin-dts)（`vue: true`）+ `vue-tsc` 生成类型声明。

## 命令

```bash
# 构建
pnpm --filter @weilasdk/ui run build

# 监听模式（开发）
pnpm --filter @weilasdk/ui run dev

# 类型检查
pnpm --filter @weilasdk/ui run typecheck
```

## 输出

构建产物位于 `dist/`：

| 文件          | 说明         |
| ------------- | ------------ |
| `index.js`    | ESM 格式     |
| `index.cjs`   | CJS 格式     |
| `index.css`   | 提取的样式   |
| `index.d.ts`  | ESM 类型声明 |
| `index.d.cts` | CJS 类型声明 |

## 使用方式

```vue
<script setup lang="ts">
import { WlStatusIndicator } from '@weilasdk/ui';
import '@weilasdk/ui/dist/index.css';
</script>

<template>
  <WlStatusIndicator status="connected" />
</template>
```

## 目录结构

```
packages/ui/
├── src/
│   ├── components/     # Vue 组件
│   │   └── WlStatusIndicator.vue
│   └── index.ts        # 入口，统一导出
├── dist/               # 构建产物
├── tsdown.config.ts    # tsdown 构建配置
├── tsconfig.json       # TypeScript 配置（含 Vue SFC 支持）
├── env.d.ts            # Vue SFC 类型声明
└── package.json
```

## 开发约定

- 组件统一使用 `Wl` 前缀命名（如 `WlStatusIndicator`）
- 使用 `<script setup lang="ts">` 编写组件
- Props 接口以 `组件名 + Props` 命名并导出（如 `WlStatusIndicatorProps`）
- 样式使用 `<style scoped>`，class 命名遵循 BEM（`wl-组件名__元素--修饰`）
- `vue` 和 `@weilasdk/core` 作为 external，不打包进产物

---

## TODOs

### packages/ui 组件库

- [ ] **CSS 导入优化**：配置 package.json 的 `exports` 支持 `@weilasdk/ui/style.css` 或探索 CSS 自动注入方案，避免消费端手动 import CSS
- [ ] **组件开发**：根据业务需求开发更多 UI 组件（登录表单、会话列表、消息气泡、PTT 按钮等）
- [ ] **主题系统**：引入 CSS Variables 或设计 Token 体系，支持主题定制
- [ ] **单元测试**：集成 Vitest + @vue/test-utils，添加组件测试
- [ ] **Storybook / Histoire**：考虑添加组件文档与可视化预览工具

### playgrounds/vue3 开发环境

- [ ] **接入 @weilasdk/ui**：在 `package.json` 添加 `"@weilasdk/ui": "workspace:*"` 依赖，并在 App.vue 或新页面中引入 UI 组件进行预览
- [ ] **路由系统**：引入 `vue-router`，将不同功能模块（登录、会话列表、对讲等）拆分为独立页面，方便逐个调试
- [ ] **状态管理**：引入 Pinia 管理 SDK 实例状态（连接状态、用户信息、会话列表等），避免 App.vue 中逻辑堆积
- [ ] **SDK 初始化流程完善**：当前 App.vue 仅做了动态 import 验证，需要补全 `weila_setWebSock` → `weila_setAuthInfo` → `weila_init` → `weila_login` 的完整登录流程
- [ ] **环境变量**：创建 `.env.example` 定义 `VITE_WS_URL`、`VITE_APP_ID`、`VITE_APP_KEY` 等配置项，避免硬编码
- [ ] **UI 组件联调**：在 playground 中使用 `@weilasdk/ui` 的组件（如 `WlStatusIndicator` 展示连接状态），验证组件库与 SDK 的集成效果
- [ ] **音频/PTT 调试页面**：添加对讲功能测试页，包含申请话权、释放话权、播放录音等操作按钮
- [ ] **HMR 联动**：确认 `@weilasdk/ui` 在 `dev` 模式下的 watch 输出能被 playground 的 Vite 正确热更新
