# Weila Web SDK 使用文档

面向 `@vois/weila-sdk-core` 的接入方。API 签名以 `dist/weilasdk.d.ts` 为准，本文件只保留流程和约定。

## 安装

```bash
npm install @vois/weila-sdk-core
```

每个 PR 和 `main` 分支的最新提交都会通过 [pkg.pr.new](https://github.com/stackblitz-labs/pkg.pr.new) 发布预览包：

```bash
pnpm add --config.block-exotic-subdeps=false \
  https://pkg.pr.new/kvoon9/weila-js-sdk/@vois/weila-sdk-core@<PR 编号或 commit SHA>
```

pnpm 11 起默认禁止 URL 形式的传递依赖，安装预览包时需要 `--config.block-exotic-subdeps=false`。

## 模块格式

SDK 只发布 ESM（`dist/*.mjs`），面向浏览器。Node 环境下模块求值期会访问 `window`，无法直接运行。CommonJS 项目请用动态 `import()`，或交给打包器处理。

```typescript
import { WeilaCore, initLogger } from '@vois/weila-sdk-core'

// 类型与数据库结构
import type { WL_IDbUserInfo } from '@vois/weila-sdk-core'
import type { WL_IDbMsgData } from '@vois/weila-sdk-core/data'
```

三个入口：

- `@vois/weila-sdk-core`：主入口，含 `WeilaCore` 与全部业务 API。
- `@vois/weila-sdk-core/data`：数据库类型与事件 ID。
- `@vois/weila-sdk-core/log`：日志工具。

## 快速入门

```typescript
import { markRaw } from 'vue'
import { WeilaCore, initLogger } from '@vois/weila-sdk-core'

initLogger('CORE:*, MOD:*, FSM:*, AUDIO:*, DB:*, NET:*')
const weila = markRaw(new WeilaCore())

weila.weila_onEvent((eventId, eventData) => {
  console.log(`[weila] event ${eventId}`, eventData)
})

await weila.weila_init({
  webSock: 'wss://api.example.com/ws',
  appId: 'YOUR_APP_ID',
  appKey: 'YOUR_APP_KEY',
})

// countryCode '0' 为微喇号，'86' 为中国手机号
const userInfo = await weila.weila_login('account', 'password', '86')
```

`weila_audioInit()` 必须在用户手势（click）中调用，否则浏览器会阻止 AudioContext。

完整类型签名见 `dist/weilasdk.d.ts`。`WeilaCore` 的公开方法都在 `packages/core/src/main/weila_core.ts` 里逐个声明。

## 架构

`WeilaCore` 是唯一门面，内部按模块拆分，每个模块一个文件：

- `main/weila_login_module.ts`：认证、登录、登出。
- `main/weila_session_module.ts`：会话列表、消息读写、已读同步。
- `main/weila_group_module.ts`：群组、成员、权限。
- `main/weila_friend_module.ts`：好友关系与邀请。
- `main/weila_user_module.ts`：用户信息查询。
- `main/weila_business_module.ts`：客服会话与业务流转。
- `main/weila_location_module.ts`：位置上报与共享。
- `main/weila_pttFsm.ts`、`main/weila_main_fsm_host.ts`：XState 5 状态机驱动的对讲与主流程。
- `main/weila_network.worker.ts`、`main/weila_network_gateway.ts`：Web Worker 网络层。
- `main/weila_audio_init_controller.ts`、`main/weila_audio_runtime.ts`：音频初始化与运行时补丁。
- `fsm/`、`database/`、`proto/`、`audio/`、`log/`：领域子目录。

## 资源配置

SDK 加载内置的 Opus WASM 与提示音。UniApp 或 CDN 部署下需要 `setConfigData` 重映射：

```typescript
import { setConfigData, WL_ConfigID } from '@vois/weila-sdk-core'

setConfigData([
  {
    id: WL_ConfigID.WL_RES_DATA_OPUS_WASM_ID,
    url: '/static/weilasdk/opuslibs.wasm',
    version: 1,
  },
])
```

枚举值列表见 `packages/core/src/main/weila_config.ts` 的 `WL_ConfigID`。

## 活跃会话未读语义

- 进入聊天页面时显式调用 `weila_setActiveSession(sessionId, sessionType)`。
- 活跃会话收到新消息时 SDK 直接推进 `readMsgId`，`lastMsgId - readMsgId` 不增加。
- 登出或重建 `WeilaCore` 后活跃会话状态清空，需重新设置。

## 日志

```typescript
initLogger('CORE:*, MOD:*, -socket-client:*')
```

前缀：`CORE`、`MOD`、`FSM`、`AUDIO`、`DB`、`NET`、`CFG`。

## 框架集成

### Vue 2/3

- `WeilaCore` 实例用 `markRaw` 包裹，避免 Proxy 劫持内部状态与 Web Worker。
- 首屏体积敏感时用动态 `import()` 加载 SDK。

### UniApp (小程序/App)

1. 把 `public/assets/` 下的资源拷到 UniApp 的 `static/weilasdk/` 目录。
2. 初始化前调用 `setConfigData` 指向小程序内的静态路径。
3. 在 `manifest.json` 里声明录音权限。

### 代理

需要代理或跨域配置的端点：

- `/v1` → Web API 服务
- `/audio` → 语音存储 OSS
- `/avatar` → 头像存储 OSS
- `/ptt` → 对讲流处理服务
