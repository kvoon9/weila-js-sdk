# Weila SDK 音频播放流程分析

## 概述

本文档详细分析 Weila SDK 中音频消息播放的完整流程，包括音频系统初始化、AudioWorklet 加载、Opus 解码器初始化以及消息传递机制。

---

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           主线程 (Main Thread)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐    ┌──────────────────┐    ┌────────────────┐  │
│  │   Vue/React UI   │───▶│   WeilaCore      │───▶│  WLAudio      │  │
│  │  (playground)    │    │  weila_playSingle│    │  openPlayer() │  │
│  └──────────────────┘    └──────────────────┘    └───────┬────────┘  │
│                                                          │            │
│                                                          ▼            │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    WLConfig.loadResource()                       │  │
│  │              (加载 WASM 到 IndexedDB)                            │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
         ┌──────────────────┐            ┌──────────────────┐
         │ AudioWorklet     │            │ AudioWorklet     │
         │ (Player)         │            │ (Recorder)       │
         │ weila_player     │            │ weila_recorder  │
         │ _worklet.js      │            │ _worklet.js     │
         └──────────────────┘            └──────────────────┘
                    │                               │
                    ▼                               ▼
         ┌──────────────────────────────────────────────────────────┐
         │                   AudioWorkletProcessor                     │
         │  • 继承 AudioWorkletProcessor                              │
         │  • 使用 Opus WASM 解码音频                                  │
         │  • 通过 port.postMessage 与主线程通信                       │
         └──────────────────────────────────────────────────────────┘
```

---

## 二、详细流程

### 2.1 初始化阶段

#### 步骤 1: SDK 初始化 (`weila_init`)

```typescript
// packages/core/src/main/weila_core.ts:575
public async weila_init(): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const callback = {} as WL_PromiseCallback
    callback.resolve = resolve
    callback.reject = reject
    this.mainFsmService.send(fsmEvents.FSM_LOAD_RESOURCE_EVT, { data: callback })
  })
}
```

触发 `FSM_LOAD_RESOURCE_EVT` 事件，开始加载资源。

#### 步骤 2: 加载资源 (`WLConfig.loadResource`)

```typescript
// packages/core/src/main/weila_config.ts:96
public static async loadResource(): Promise<boolean> {
  const db = new WLConfigDB()
  for (let item of configItemInfo) {
    // item.dataType === 'buffer' 时
    // 使用 fetch 获取 WASM 文件为 arraybuffer
    responseData = await this.fetchUrl(item.url, 'arraybuffer')
    configDataItem.resource_data = new Uint8Array(responseData)
    // 存入 IndexedDB
    await db.configTable.bulkPut([dbItem], null, { allKeys: true })
  }
  return true
}
```

**关键配置项** (`weila_config.ts:51`):

```typescript
{
  id: WL_ConfigID.WL_RES_DATA_OPUS_WASM_ID,
  url: opus_lib_wasm,  // 从 assets/opuslibs.wasm 导入
  dataType: 'buffer',
  version: 1
}
```

#### 步骤 3: 音频系统初始化 (`weila_audioInit`)

```typescript
// packages/core/src/main/weila_core.ts:613
public async weila_audioInit(): Promise<boolean> {
  return this.sessionModule.initAudioSystem()
}
```

#### 步骤 4: WLAudio 初始化 (`WLAudio.init`)

```typescript
// packages/core/src/audio/weila_audio.ts:90
public async init(): Promise<boolean> {
  if (!this.isInited) {
    // 1. 创建 AudioContext
    this.audioContext = new AudioContext({ sampleRate: defaulSampleRate })
    if (this.audioContext.state !== 'running') {
      await this.audioContext.resume()
    }

    // 2. 加载 AudioWorklet 模块
    await this.audioContext.audioWorklet.addModule(PlayerWorklet)
    await this.audioContext.audioWorklet.addModule(RecorderWorklet)

    this.isInited = true
  }
  return true
}
```

**关键点**: `PlayerWorklet` 和 `RecorderWorklet` 是通过 webpack 的 `worklet-loader` 加载的：

```typescript
// packages/core/src/audio/weila_audio.ts:1-4
// @ts-ignore
import PlayerWorklet from './weila_player.worklet.js'
// @ts-ignore
import RecorderWorklet from './weila_recorder.worklet.js'
```

---

### 2.2 播放阶段

#### 步骤 5: 调用播放 (`weila_playSingle`)

```typescript
// packages/core/src/main/weila_core.ts:621
public async weila_playSingle(audioMsgData: WL_IDbMsgData): Promise<boolean> {
  // ... 处理音频数据类型
  return this.sessionModule.playSingleAudioItem(audioMsgData)
}
```

#### 步骤 6: FSM 状态机处理

```typescript
// packages/core/src/main/weila_session_module.ts:788
public async playSingleAudioItem(msgData: WL_IDbMsgData): Promise<boolean> {
  return this.pttFsm.playSingle(msgData)
}

// packages/core/src/main/weila_pttFsm.ts:815
async playSingle(msgData: WL_IDbMsgData): Promise<boolean> {
  const audioItem = {} as WL_PttAudioItem
  audioItem.msgData = msgData
  audioItem.playerType = WLPlayerType.WL_PTT_SINGLE_PLAYER
  // 发送 FSM 事件
  this.pttFsmService.send('FSM_PLAY_SINGLE_EVT', { data: audioItem })
  return true
}
```

#### 步骤 7: FSM Entry Action - 打开播放器

```typescript
// packages/core/src/main/weila_pttFsm.ts:211
onSinglePlayEntry(context: any, event: any, actionMeta: any) {
  // 打开播放器
  this.audioManager.openPlayer(WLPlayerType.WL_PTT_SINGLE_PLAYER, 16000)
    .then((openRet) => {
      // 播放铃声
      WeilaRingPlayer.weila_playRing(WL_ConfigID.WL_RES_RING_START_PLAY_ID)
        .then(() => {
          // 开始播放
          this.audioManager.startPlay(WLPlayerType.WL_PTT_SINGLE_PLAYER)
            .then(() => {
              // 发送音频数据
              this.feedAudioPayload(this.singlePttPlayItem, ...)
            })
        })
    })
}
```

---

### 2.3 打开播放器核心流程 (`WLAudio.openPlayer`)

```typescript
// packages/core/src/audio/weila_audio.ts:186
public async openPlayer(playerType: WLPlayerType, sampleRate: number): Promise<boolean> {
  // 1. 获取 WASM 配置数据
  const configData = await WLConfig.getConfigData(WL_ConfigID.WL_RES_DATA_OPUS_WASM_ID)

  // 2. 创建 AudioWorkletNode
  this.playerWorkNode[playerType] = new AudioWorkletNode(
    this.audioContext,
    'weila_player_processor',
    {
      channelCount: 2,
      processorOptions: {
        wasmData: configData.resource_data,  // WASM 二进制数据
        workerName: wl_playerName[playerType],
        playerType: playerType,
      },
    },
  )

  // 3. 监听 worklet 消息
  this.playerWorkNode[playerType].port.addEventListener(
    'message',
    this.onPlayerMessage.bind(this),
  )

  // 4. 发送 OPEN_REQ 到 worklet
  this.sendPlayerEvent(playerType, WLAudioPlayerEvent.WL_WORKLET_NODE_OPEN_REQ, {
    sampleRate: sampleRate,
  })

  // 5. 等待响应 (超时 5 秒)
  return new Promise<boolean>((resolve, reject) => {
    const callback = {} as WLAudioCallback
    callback.resolve = resolve
    callback.reject = reject
    callback.waitRspTimer = setTimeout(
      (cb) => {
        if (cb.reject) {
          cb.reject(new Error('请求超时 1'))  // ⬅️ 错误发生在这里
        }
      },
      5000,
      callback,
    )
    this.sendingEventListMap.set(WLAudioPlayerEvent.WL_WORKLET_NODE_OPEN_RSP, callback)
  })
}
```

---

### 2.4 AudioWorklet 处理流程

#### Worklet 接收 OPEN_REQ

```javascript
// packages/core/src/audio/weila_player.worklet.js:108
case WLAudioPlayerEvent.WL_WORKLET_NODE_OPEN_REQ:
  {
    this.sampleRate = ev.data.sampleRate
    this.pcmRingBuffer = new WeilaRingBuffer(this.sampleRate * 80, true)
    this.state = PLAY_OPENING

    // 初始化 Opus 解码器
    if (this.opusModule == null) {
      const Module = {}
      Module['wasmBinary'] = this.wasmData  // 从 processorOptions 传入

      opus(Module)  // 初始化 WASM
        .then((value) => {
          this.opusModule = value
          this.decoder = this.opusModule._Opus_initDecoder(this.sampleRate, 1)

          // 分配内存...

          // 发送 OPEN_RSP 响应
          this.reportRsp(WLAudioPlayerEvent.WL_WORKLET_NODE_OPEN_RSP, true)
          this.state = PLAY_OPENED
        })
        .catch((reason) => {
          this.reportRsp(WLAudioPlayerEvent.WL_WORKLET_NODE_OPEN_RSP, false, '出现异常:' + reason)
        })
    }
  }
```

---

## 三、消息流程图

```
主线程 (Main Thread)                          AudioWorklet (Player)
     │                                              │
     │  1. addModule(PlayerWorklet)                  │
     │─────────────────────────────────────────────▶│
     │                                              │ 加载 JS 模块
     │                                              │
     │  2. new AudioWorkletNode(                    │
     │     'weila_player_processor',                │
     │     { wasmData: Uint8Array }                 │
     │  )                                          │
     │─────────────────────────────────────────────▶│
     │                                              │ 创建 processor
     │                                              │
     │  3. WL_WORKLET_NODE_OPEN_REQ                │
     │◀─────────────────────────────────────────────│
     │     (postMessage)                           │
     │                                              │
     │  初始化 Opus WASM                            │
     │                                              │
     │  4. WL_WORKLET_NODE_OPEN_RSP (result=true)  │
     │─────────────────────────────────────────────▶│
     │     (等待响应，超时 5s)                     │
     │                                              │
     │  5. startPlay()                             │
     │  6. putPlayerOpusData()                     │
     │◀─────────────────────────────────────────────│
     │     (音频数据)                               │
```

---

## 四、问题排查点

### 4.1 "请求超时 1" 错误

**错误位置**: `weila_audio.ts:226-234`

**原因分析**:

1. **WASM 加载失败** - `WLConfig.getConfigData()` 返回空数据或错误数据
2. **AudioWorklet 加载失败** - `addModule()` 抛出异常或未正确注册
3. **消息传递失败** - Worklet 未正确响应

**排查步骤**:

1. 检查浏览器控制台是否有 WASM 编译错误
2. 检查 Network 面板中 WASM 文件请求状态
3. 开启详细日志：
   ```typescript
   initLogger('MOD:*, CORE:*, FSM:*, AUDIO:*, DB:*, NET:*')
   ```
4. 检查 IndexedDB 中 `WeilaConfigDB` 的缓存数据

---

### 4.2 WASM 文件加载问题

**可能原因**:

1. **路径错误** - WASM 文件 URL 返回 404
2. **CORS 问题** - 跨域请求被阻止
3. **MIME 类型** - 服务器返回的 Content-Type 不正确
4. **缓存问题** - IndexedDB 中缓存了错误的数据

**解决方案**:

1. 使用 version 号强制重新加载：
   ```typescript
   setConfigData([
     {
       id: WL_ConfigID.WL_RES_DATA_OPUS_WASM_ID,
       url: '/opuslibs.wasm',
       version: 999, // 使用更大的版本号
     },
   ])
   ```
2. 清除浏览器 IndexedDB

---

### 4.3 AudioWorklet 加载问题

**问题**: webpack 的 `worklet-loader` 在 ESM 模式下可能无法正常工作

**解决方案**:

1. 使用 public 目录中的 IIFE 文件
2. Monkey patch `AudioWorklet.addModule` to redirect blob: URLs to IIFE files:

   ```typescript
   const originalAddModule = window.AudioWorklet.prototype.addModule
   let workletCallCount = 0
   window.AudioWorklet.prototype.addModule = async function (moduleURL) {
     // webpack worklet-loader creates blob: URLs (e.g., blob:https://localhost:5173/{uuid})
     // Blob URLs have no base path context, so relative ES module imports fail silently
     // Solution: redirect blob URLs to pre-built IIFE versions in public/
     if (moduleURL.startsWith('blob:')) {
       const workletList = [
         '/weila_player.worklet.iife.js', // First call
         '/weila_recorder.worklet.iife.js', // Second call
       ]
       const iifePath = workletList[workletCallCount++] || moduleURL
       return originalAddModule.call(this, iifePath)
     }
     // Non-blob URLs: filename-based routing (fallback for compatibility)
     const workletMap = {
       'weila_player.worklet.js': '/weila_player.worklet.iife.js',
       'weila_recorder.worklet.js': '/weila_recorder.worklet.iife.js',
     }
     const fileName = moduleURL.split('/').pop()
     if (workletMap[fileName]) {
       return originalAddModule.call(this, workletMap[fileName])
     }
     return originalAddModule.call(this, moduleURL)
   }
   ```

   **Why blob URLs are problematic**: webpack's `worklet-loader` (with `inline: true`) generates blob: URLs that carry no base URL context. When the worklet code tries to execute relative imports like `import opus from './opus'`, the browser cannot resolve them relative to a blob origin, and the import fails silently. By redirecting to pre-built IIFE versions in `public/`, all dependencies are inlined and the worklet initializes correctly.

---

## 五、关键代码位置

| 功能           | 文件位置                                             |
| -------------- | ---------------------------------------------------- |
| SDK 入口       | `packages/core/src/weilasdk.ts`                      |
| 播放 API       | `packages/core/src/main/weila_core.ts:621`           |
| 会话模块       | `packages/core/src/main/weila_session_module.ts:788` |
| FSM 状态机     | `packages/core/src/main/weila_pttFsm.ts:815`         |
| 音频管理器     | `packages/core/src/audio/weila_audio.ts`             |
| Player Worklet | `packages/core/src/audio/weila_player.worklet.js`    |
| 配置加载       | `packages/core/src/main/weila_config.ts:96`          |

---

## 六、WASM 数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                     WLConfig.loadResource()                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. fetch('opuslibs.wasm')  ──▶  ArrayBuffer                  │
│                                                                 │
│  2. new Uint8Array(responseData)  ──▶  Uint8Array              │
│                                                                 │
│  3. IndexedDB.WeilaConfigDB  ──▶  {                          │
│       id: WL_RES_DATA_OPUS_WASM_ID,                           │
│       resource_data: Uint8Array  ⬅️ 这里存储的是完整 WASM       │
│     }                                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              WLAudio.openPlayer()                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. WLConfig.getConfigData(WL_RES_DATA_OPUS_WASM_ID)           │
│     从 IndexedDB 读取 resource_data                             │
│                                                                 │
│  2. new AudioWorkletNode(                                      │
│       'weila_player_processor',                                 │
│       {                                                        │
│         processorOptions: {                                      │
│           wasmData: configData.resource_data  ⬅️ 传入 WASM    │
│         }                                                      │
│       }                                                        │
│     )                                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  weila_player.worklet.js                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. constructor(options)                                       │
│     this.wasmData = options.processorOptions.wasmData          │
│                                                                 │
│  2. onMessage(WL_WORKLET_NODE_OPEN_REQ)                       │
│     const Module = {}                                          │
│     Module['wasmBinary'] = this.wasmData                       │
│                                                                 │
│     opus(Module)  // 异步初始化 WASM                           │
│       .then((opusModule) => {                                 │
│         this.decoder = opusModule._Opus_initDecoder(...)       │
│         this.reportRsp(WL_WORKLET_NODE_OPEN_RSP, true)         │
│       })                                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 七、当前已知问题

### 问题 1: Vite 开发环境不支持 webpack worklet-loader

**现象**:

- 使用 `workspace:*` 引用 `@weilasdk/core` 时
- `import PlayerWorklet from './weila_player.worklet.js'` 无法被 Vite 处理
- webpack 的 `worklet-loader` 只在 webpack 构建时生效

**影响**:

- `AudioWorklet.addModule()` 无法正确加载 worklet
- 导致 `WL_WORKLET_NODE_OPEN_RSP` 永远收不到
- 5 秒后超时报错 "请求超时 1"

**临时解决方案**:

- 使用 public 目录中的 IIFE 文件
- Monkey patch `AudioWorklet.addModule` 重定向到 IIFE 文件
