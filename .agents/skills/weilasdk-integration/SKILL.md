---
name: weilasdk-integration
description: |
  微喇 SDK (Weila Web SDK) 集成技能。用于将 SDK 集成到各种前端项目中，
  包括: (1) Vue 2/3 项目集成, (2) React 项目集成, (3) UniApp 项目集成,
  (4) SDK 初始化与配置, (5) 构建与资源管理。帮助用户快速上手使用微喇通讯 SDK。
---

# 微喇 SDK 集成

## 快速开始

### 1. 安装 SDK

```bash
npm install weilasdk
# 或
pnpm add weilasdk
```

### 2. 基础初始化

```typescript
import { WeilaCore, setConfigData, WL_ConfigID, initLogger } from 'weilasdk'

// 创建实例
const weila = new WeilaCore()

// 初始化日志
initLogger('MOD:*, CORE:*, FSM:*, AUDIO:*, DB:*, NET:*, -socket-client:*')

// 设置服务器地址（尽早调用）
weila.weila_setWebSock('wss://your-server.com')

// 设置 App 认证（尽早调用）
weila.weila_setAuthInfo('your-app-id', 'your-app-key')

// 注册事件回调
weila.weila_onEvent((eventId, data) => {
  console.log('事件:', eventId, data)
})

// 初始化
await weila.weila_init()

// 音频初始化（在用户点击事件中调用）
await weila.weila_audioInit()
```

### 3. 用户登录

```typescript
// 登录（微喇号或手机号）
const userInfo = await weila.weila_login('13800138000', 'password', '86')
```

## 框架集成

详细集成指南见 references 文件：

| 框架   | 文件                              | 说明                                  |
| ------ | --------------------------------- | ------------------------------------- |
| Vue 3  | [vue3.md](references/vue3.md)     | Vue 3 项目集成（含 markRaw 最佳实践） |
| Vue 2  | [vue2.md](references/vue2.md)     | Vue 2 项目集成                        |
| UniApp | [uniapp.md](references/uniapp.md) | UniApp 跨平台集成                     |
| React  | [react.md](references/react.md)   | React 项目集成                        |

## 配置参考

### 资源路径配置

用于自定义 CDN 或本地资源：

```typescript
setConfigData([
  {
    id: WL_ConfigID.WL_RES_RING_START_PLAY_ID,
    url: 'https://cdn.example.com/start_player.wav',
    version: 1,
  },
  {
    id: WL_ConfigID.WL_RES_RING_STOP_PLAY_ID,
    url: 'https://cdn.example.com/stop_player.wav',
    version: 1,
  },
  {
    id: WL_ConfigID.WL_RES_RING_START_RECORD_ID,
    url: 'https://cdn.example.com/start_record.wav',
    version: 1,
  },
  {
    id: WL_ConfigID.WL_RES_RING_STOP_RECORD_ID,
    url: 'https://cdn.example.com/stop_record.wav',
    version: 1,
  },
  {
    id: WL_ConfigID.WL_RES_DATA_OPUS_WASM_ID,
    url: 'https://cdn.example.com/opuslibs.wasm',
    version: 1,
  },
])
```

### 代理配置

开发环境配置见 [proxy.md](references/proxy.md)：

| 路径    | 目标服务器                                       |
| ------- | ------------------------------------------------ |
| /v1     | http://webapi.weila.hk:8080/                     |
| /audio  | https://weilaaudio.oss-cn-shenzhen.aliyuncs.com  |
| /avatar | https://weilaavatar.oss-cn-shenzhen.aliyuncs.com |
| /ptt    | https://weilaspeech.oss-cn-shenzhen.aliyuncs.com |

## 常见任务

### 发送消息

```typescript
// 文本
await weila.weila_sendTextMsg(sessionId, sessionType, '你好')

// 图片
await weila.weila_sendImage(sessionId, sessionType, 'photo.jpg', imageFile)
```

### 音频播放

```typescript
// 播放语音
await weila.weila_playSingle(audioMsgData)
weila.weila_stopSingle()
```

### 群组操作

```typescript
// 创建群
const group = await weila.weila_createGroup('群名', WL_IDbGroupType.GROUP_NORMAL, null, 0, [
  userId1,
  userId2,
])

// 获取群列表
const groups = await weila.weila_getAllGroups()
```

完整 API 参考：[api-quickref.md](references/api-quickref.md)

## 构建与发布

### 生产构建

```bash
npm run "build production"
```

输出文件：

- `dist/weilasdk.js` - 主 SDK
- `dist/weilasdk_data.js` - 数据模块
- `dist/weilasdk_log.js` - 日志模块
- `dist/weilasdk.d.ts` - TypeScript 类型定义

### 开发构建

```bash
npm run "build development"
```

## 调试

### 启用完整日志

```typescript
initLogger('*')
```

### 常见问题

| 问题               | 解决方案                                      |
| ------------------ | --------------------------------------------- |
| 音频初始化失败     | 确保 `weila_audioInit()` 在用户点击事件中调用 |
| WebSocket 连接失败 | 检查 `weila_setWebSock()` 地址是否正确        |
| 登录失败           | 检查 App ID/Key 是否正确，账号密码是否有效    |
| 消息发送失败       | 检查 `isLoginReady` 状态                      |

详细调试指南：[debugging.md](references/debugging.md)
