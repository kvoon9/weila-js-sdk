# UniApp 项目集成

## 资源准备

1. 复制 `public/assets/` 目录到 `static/weilasdk/`：

```bash
# 假设在项目根目录
cp -r public/assets/* static/weilasdk/
```

2. 确保以下文件存在：
   - `static/weilasdk/start_player.wav`
   - `static/weilasdk/stop_player.wav`
   - `static/weilasdk/start_record.wav`
   - `static/weilasdk/stop_record.wav`
   - `static/weilasdk/opuslibs.wasm`

## SDK 初始化

### 方式一：NVue/UniApp Vue2

创建 `src/utils/weila.js`：

```javascript
import { WeilaCore, setConfigData, WL_ConfigID, initLogger } from 'weilasdk'

// 资源路径（根据实际部署路径调整）
const STATIC_BASE = '/static/weilasdk/'

// 配置资源路径
function configResources() {
  setConfigData([
    {
      id: WL_ConfigID.WL_RES_RING_START_PLAY_ID,
      url: STATIC_BASE + 'start_player.wav',
      version: 1,
    },
    {
      id: WL_ConfigID.WL_RES_RING_STOP_PLAY_ID,
      url: STATIC_BASE + 'stop_player.wav',
      version: 1,
    },
    {
      id: WL_ConfigID.WL_RES_RING_START_RECORD_ID,
      url: STATIC_BASE + 'start_record.wav',
      version: 1,
    },
    {
      id: WL_ConfigID.WL_RES_RING_STOP_RECORD_ID,
      url: STATIC_BASE + 'stop_record.wav',
      version: 1,
    },
    {
      id: WL_ConfigID.WL_RES_DATA_OPUS_WASM_ID,
      url: STATIC_BASE + 'opuslibs.wasm',
      version: 1,
    },
  ])
}

let weilaInstance = null

export function initWeila() {
  if (weilaInstance) {
    return weilaInstance
  }

  // 先配置资源路径
  configResources()

  weilaInstance = new WeilaCore()

  // 初始化日志
  initLogger('MOD:*, CORE:*, FSM:*, AUDIO:*, DB:*, NET:*')

  // 设置服务器
  // #ifdef H5
  weilaInstance.weila_setWebSock('wss://your-server.com')
  weilaInstance.weila_setAuthInfo('your-app-id', 'your-app-key')
  // #endif

  // 注册事件
  weilaInstance.weila_onEvent((eventId, data) => {
    console.log('[Weila]', eventId, data)
  })

  return weilaInstance
}

export function getWeila() {
  if (!weilaInstance) {
    throw new Error('Weila SDK 未初始化')
  }
  return weilaInstance
}
```

### 方式二：UniApp Vue3

创建 `src/utils/weila.ts`：

```typescript
import { WeilaCore, setConfigData, WL_ConfigID, initLogger } from 'weilasdk'

const STATIC_BASE = '/static/weilasdk/'

function configResources() {
  setConfigData([
    {
      id: WL_ConfigID.WL_RES_RING_START_PLAY_ID,
      url: STATIC_BASE + 'start_player.wav',
      version: 1,
    },
    { id: WL_ConfigID.WL_RES_RING_STOP_PLAY_ID, url: STATIC_BASE + 'stop_player.wav', version: 1 },
    {
      id: WL_ConfigID.WL_RES_RING_START_RECORD_ID,
      url: STATIC_BASE + 'start_record.wav',
      version: 1,
    },
    {
      id: WL_ConfigID.WL_RES_RING_STOP_RECORD_ID,
      url: STATIC_BASE + 'stop_record.wav',
      version: 1,
    },
    { id: WL_ConfigID.WL_RES_DATA_OPUS_WASM_ID, url: STATIC_BASE + 'opuslibs.wasm', version: 1 },
  ])
}

let weilaInstance: WeilaCore | null = null

export function initWeila() {
  if (weilaInstance) return weilaInstance

  configResources()
  weilaInstance = new WeilaCore()

  initLogger('MOD:*, CORE:*, FSM:*, AUDIO:*, DB:*, NET:*')

  // #ifdef H5
  weilaInstance.weila_setWebSock('wss://your-server.com')
  weilaInstance.weila_setAuthInfo('your-app-id', 'your-app-key')
  // #endif

  weilaInstance.weila_onEvent((eventId, data) => {
    console.log('[Weila]', eventId, data)
  })

  return weilaInstance
}

export function getWeila(): WeilaCore {
  if (!weilaInstance) {
    throw new Error('Weila SDK 未初始化')
  }
  return weilaInstance
}
```

## Webpack 配置

UniApp 需要添加 `.wasm` 文件支持：

```javascript
// vue.config.js (UniApp Vue2)
// 或 uni.config.js (UniApp Vue3)

module.exports = {
  chainWebpack: (config) => {
    // 添加 WASM 文件支持
    config.module
      .rule('wasm')
      .test(/\.wasm$/)
      .type('asset/resource')
  },
}
```

## 使用示例

```vue
<template>
  <view>
    <button @click="handleLogin">登录</button>
  </view>
</template>

<script>
import { initWeila, getWeila } from '@/utils/weila'

export default {
  onLoad() {
    // 初始化 SDK
    const weila = initWeila()
    weila.weila_init().then(() => {
      console.log('SDK 初始化完成')
    })
  },
  methods: {
    async handleLogin() {
      const weila = getWeila()

      // 音频初始化必须在用户点击事件中
      await weila.weila_audioInit()

      // 登录
      const userInfo = await weila.weila_login('13800138000', 'password', '86')
      console.log('登录成功', userInfo)
    },
  },
}
</script>
```

## 注意事项

### 平台判断

UniApp 是跨平台框架，Weila SDK 只能在 H5 环境中使用：

```javascript
// #ifdef H5
weilaInstance.weila_setWebSock('wss://your-server.com')
weilaInstance.weila_setAuthInfo('app-id', 'app-key')
// #endif

// #ifndef H5
console.warn('Weila SDK 仅支持 H5 平台')
// #endif
```

### 资源路径

- H5 平台：使用 `/static/` 路径
- 小程序平台：不支持 Weila SDK

### 音频播放

UniApp 的音频 API 与 Web 不同，可能需要适配：

```javascript
// 如果需要自定义音频播放
weila.weila_onEvent((eventId, data) => {
  if (eventId === 'WL_EXT_PTT_PLAY_IND') {
    // 处理播放事件
    // 可以使用 uni.createInnerAudioContext() 播放
  }
})
```
