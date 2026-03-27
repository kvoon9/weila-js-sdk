# WLAudio 语音播放架构文档

## 概述

`WLAudio` 是 `packages/core` 中的核心音频模块，负责管理音频播放和录音功能。基于 Web Audio API 和 AudioWorklet 实现，支持 Opus 编解码。

## 目录结构

```
packages/core/src/audio/
├── weila_audio.ts          # 核心音频管理类
├── weila_audio_data.ts     # 事件和类型定义
├── weila_audio_manager.ts  # 音频管理器（上层封装）
├── weila_player.worklet.js # 播放工作线程
└── weila_recorder.worklet.js # 录音工作线程
```

---

## 播放器类型

```typescript
enum WLPlayerType {
  WL_PTT_STREAM_PLAYER,   // 0: 流式播放（实时语音）
  WL_PTT_HISTORY_PLAYER,  // 1: 历史播放（消息回放）
  WL_PTT_SINGLE_PLAYER,  // 2: 单次播放
  WL_PTT_PLAYER_NUM,      // 3: 播放器数量
}
```

**特点**：
- 三个独立的播放器，可以同时播放不同的音频
- 每个播放器有独立的状态机
- 状态互不影响

---

## 播放器状态机

```typescript
enum WLPlayerState {
  WL_PLAYER_OPENING,    // 正在打开
  WL_PLAYER_STOPPED,    // 已停止（就绪）
  WL_PLAYER_STARTING,   // 正在开始
  WL_PLAYER_STARTED,    // 已启动（播放中）
  WL_PLAYER_STOPPING,   // 正在停止
  WL_PLAYER_PAUSING,    // 正在暂停
  WL_PLAYER_PAUSED,     // 已暂停
  WL_PLAYER_RESUMING,   // 正在恢复
  WL_PLAYER_CLOSING,    // 正在关闭
  WL_PLAYER_CLOSED,     // 已关闭
}
```

### 状态转换图

```
                              closePlayer()
                                   |
    openPlayer()                  /
         |                       /
         v                      /
    OPENING -----> STOPPED <------ CLOSING
         |            ^               |
         |            |               |
    startPlay()   stopPlay()    closePlayer()
         |            |               |
         v            v               |
    STARTING -----> STARTED           |
         |            |               |
         |       pausePlay()          /
         |            |             /
         |            v           /
         |         PAUSING -------
         |            |
         |       resumePlay()
         |            |
         +---------> PAUSED
```

---

## 播放流程

### 1. 初始化

```typescript
await audio.init()
```

- 创建 `AudioContext`（采样率 16000Hz）
- 注册 `PlayerWorklet` 和 `RecorderWorklet`
- 只需执行一次

### 2. 打开播放器

```typescript
await audio.openPlayer(playerType: WLPlayerType, sampleRate: number)
```

**前置条件**：`playState === WL_PLAYER_CLOSED`

**流程**：
1. 创建 `AudioWorkletNode`（weila_player_processor）
2. 加载 Opus WASM 解码器
3. 发送 `OPEN_REQ`，等待 `OPEN_RSP`

### 3. 开始播放

```typescript
await audio.startPlay(playerType: WLPlayerType)
```

**前置条件**：`playState === WL_PLAYER_STOPPED`

**流程**：
1. 创建 `AudioBufferSourceNode`（循环静音缓冲）
2. 连接音频节点：`Source -> WorkletNode -> Destination`
3. 发送 `START_REQ`，等待 `START_RSP`
4. 状态变为 `WL_PLAYER_STARTED`

### 4. 写入音频数据

```typescript
audio.putPlayerOpusData(playerType: WLPlayerType, opusData: Uint8Array[])
```

- 将 Opus 编码的音频数据送入 Worklet 处理
- 使用 `CompoUint8Array` 合并多个数据块
- 数据通过 `postMessage` 传递（使用 Transferable 优化性能）

### 5. 结束播放

```typescript
audio.putPlayerOpusData(playerType, null)  // 通知最后一帧
```

- 发送 `END_DATA` 事件
- Worklet 会在播完所有数据后发送 `FINISH_PLAY` 事件

### 6. 暂停 / 恢复

```typescript
await audio.pausePlay(playerType)   // 暂停
await audio.resumePlay(playerType)   // 恢复
```

**前置条件**：
- `pausePlay`: `playState === WL_PLAYER_STARTED || WL_PLAYER_STARTING`
- `resumePlay`: `playState === WL_PLAYER_PAUSED || WL_PLAYER_PAUSING`

### 7. 停止播放

```typescript
await audio.stopPlay(playerType)
```

**前置条件**：`STARTED | STARTING | PAUSING | PAUSED | RESUMING`

**流程**：
1. 断开音频节点连接
2. 发送 `STOP_REQ`，等待 `STOP_RSP`
3. 状态变为 `WL_PLAYER_STOPPED`

### 8. 关闭播放器

```typescript
await audio.closePlayer(playerType)
```

**前置条件**：`playState !== CLOSED && playState !== CLOSING`

---

## 事件机制

### 播放器事件（Request/Response）

| Request | Response | 说明 |
|---------|----------|------|
| `WL_WORKLET_NODE_OPEN_REQ` | `WL_WORKLET_NODE_OPEN_RSP` | 打开播放器 |
| `WL_WORKLET_NODE_START_REQ` | `WL_WORKLET_NODE_START_RSP` | 开始播放 |
| `WL_WORKLET_NODE_PAUSE_REQ` | `WL_WORKLET_NODE_PAUSE_RSP` | 暂停播放 |
| `WL_WORKLET_NODE_RESUME_REQ` | `WL_WORKLET_NODE_RESUME_RSP` | 恢复播放 |
| `WL_WORKLET_NODE_STOP_REQ` | `WL_WORKLET_NODE_STOP_RSP` | 停止播放 |
| `WL_WORKLET_NODE_CLOSE_REQ` | `WL_WORKLET_NODE_CLOSE_RSP` | 关闭播放器 |

### 数据事件（单向）

| Event | Direction | 说明 |
|-------|-----------|------|
| `WL_WORKLET_NODE_PUT_DATA` | JS -> Worklet | 写入 Opus 数据 |
| `WL_WORKLET_NODE_END_DATA` | JS -> Worklet | 通知数据结束 |
| `WL_WORKLET_NODE_FINISH_PLAY` | Worklet -> JS | 播放完成通知 |

### 主动通知事件

```typescript
audio.onAudioEvent((event: WLAudioEvent, data: any) => {
  switch (event) {
    case WLAudioEvent.WL_AUDIO_FINISH_PLAY_IND:
      // 播放完成
      break
    case WLAudioEvent.WL_AUDIO_OPUS_CODED_DATA_IND:
      // 录音数据（Opus 编码）
      break
  }
})
```

---

## 典型使用示例

```typescript
const audio = new WLAudio()

// 1. 初始化
await audio.init()

// 2. 打开播放器
await audio.openPlayer(WLPlayerType.WL_PTT_SINGLE_PLAYER, 16000)

// 3. 开始播放
await audio.startPlay(WLPlayerType.WL_PTT_SINGLE_PLAYER)

// 4. 循环写入数据
for (const chunk of audioChunks) {
  audio.putPlayerOpusData(WLPlayerType.WL_PTT_SINGLE_PLAYER, chunk)
}

// 5. 结束
audio.putPlayerOpusData(WLPlayerType.WL_PTT_SINGLE_PLAYER, null)

// 6. 监听播放完成
audio.onAudioEvent((event, playerType) => {
  if (event === WLAudioEvent.WL_AUDIO_FINISH_PLAY_IND) {
    console.log(`播放器 ${playerType} 播放完成`)
  }
})

// 7. 关闭播放器
await audio.closePlayer(WLPlayerType.WL_PTT_SINGLE_PLAYER)
```

---

## 多播放器并发

三个播放器完全独立，可以同时播放：

```typescript
// 同时播放三路音频
await audio.startPlay(WLPlayerType.WL_PTT_STREAM_PLAYER)   // 实时语音
await audio.startPlay(WLPlayerType.WL_PTT_HISTORY_PLAYER)  // 历史消息
await audio.startPlay(WLPlayerType.WL_PTT_SINGLE_PLAYER)   // 单次提示音
```

---

## 注意事项

1. **状态检查**：每次操作前都会检查状态，不符合条件会 reject
2. **超时处理**：所有请求都有 5 秒超时
3. **不自动停止**：播放新音频不会自动停止旧音频，需要上层自行调用 `stopPlay()`
4. **Worklet 通信**：使用 `postMessage` + Transferable 优化大数据传输
5. **Opus 解码**：解码在 Worklet 线程执行，WASM 解码器由配置中心加载

---

## 类结构

```
WLAudio
├── 属性
│   ├── audioContext: AudioContext
│   ├── playerWorkNode: AudioWorkletNode[3]
│   ├── playerSource: AudioBufferSourceNode[3]
│   ├── playState: WLPlayerState[3]
│   ├── playSampleRate: number[3]
│   ├── sendingEventListMap: Map<Event, Callback>
│   └── emitter: TinyEmitter
│
└── 方法
    ├── init(): Promise<boolean>
    ├── onAudioEvent(callback)
    ├── openPlayer(playerType, sampleRate): Promise<boolean>
    ├── startPlay(playerType): Promise<boolean>
    ├── pausePlay(playerType): Promise<boolean>
    ├── resumePlay(playerType): Promise<boolean>
    ├── stopPlay(playerType): Promise<boolean>
    ├── closePlayer(playerType): Promise<boolean>
    ├── putPlayerOpusData(playerType, opusData): void
    ├── isPlayerPaused(playerType): boolean
    └── isPlayerStarted(playerType): boolean
```
