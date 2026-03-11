# 音频播放故障排查报告

> **项目**：微喇 Web SDK（wl-js-sdk）  
> **环境**：Vite 开发服务器 + `@weilasdk/core`（Webpack 5 构建产物）  
> **现象**：PTT 语音消息播放失败，控制台报错 `请求超时 1`  
> **状态**：✅ 已全部修复（3 个独立 Bug，3 次 commit）

---

## 背景

`@weilasdk/core` 是用 Webpack 5 构建的 UMD 包，其中的音频功能依赖 **Web Audio API** 中的 `AudioWorklet` 机制。当我们在 Vite 开发服务器中集成这个 SDK 时，出现了语音消息无法播放的问题。

错误表现为：每次点击播放，约 5 秒后控制台出现 `请求超时 1`，音频始终无声。

---

## Bug 1：Worklet 文件加载失败

### 原因

SDK 在加载音频处理模块（AudioWorklet）时，会通过 `AudioWorklet.prototype.addModule()` 传入文件 URL。在 Webpack 构建环境中，这些文件被打包成了 **Blob URL**（形如 `blob:http://.../<uuid>`）。

Blob URL 的问题在于：它自身没有"文件名"，也没有目录结构，因此 worklet 文件内部无法通过相对路径 `import './opus'` 加载依赖，最终静默失败，worklet 根本没有运行起来。

我们最初的修复代码写了这样一段逻辑：

```js
// 错误写法：把 blob URL 按 '/' 切割取最后一段
const fileName = moduleURL.split('/').pop()
// 得到的是 blob UUID，如 "550e8400-e29b-41d4-a716-446655440000"
// 而不是文件名，所以匹配永远失败
```

此外，代码本来想 patch `AudioContext.prototype.addModule`，但这个方法并不存在 —— 正确的挂载点是 `AudioWorklet.prototype.addModule`。

### 修复方案

将两个 worklet 文件预先构建为 **IIFE 格式**（自包含，无外部 import），放入 `public/` 目录。然后用一个**顺序计数器**：SDK 第 1 次调用 `addModule` 重定向到 `player` worklet，第 2 次重定向到 `recorder` worklet，彻底绕开 Blob URL 问题。

```js
// 修复后：按调用顺序重定向，不依赖文件名匹配
const workletRedirects = ['/weila_player.worklet.iife.js', '/weila_recorder.worklet.iife.js']
let workletCallIndex = 0

AudioWorklet.prototype.addModule = async function (moduleURL, ...args) {
  if (moduleURL.startsWith('blob:') && workletCallIndex < workletRedirects.length) {
    return originalAddModule.call(this, workletRedirects[workletCallIndex++], ...args)
  }
  return originalAddModule.call(this, moduleURL, ...args)
}
```

---

## Bug 2：WASM 文件路径错误 + 缓存问题

### 原因

SDK 内部硬编码了 Opus 解码器 WASM 文件的路径为 `/assets/opuslibs.wasm`，这是 Webpack 的资产目录约定。但在 Vite 开发服务器中，这个路径并不存在。

更隐蔽的问题在于：Vite 对不存在的路径返回的不是 `404 Not Found`，而是返回 `200 OK` + 一段 HTML 错误页面内容（450 字节）。

于是 SDK 以为 WASM 下载成功了，把这段 HTML 当作 WASM 内容存入了 **IndexedDB** 缓存（version 1）。之后每次启动，SDK 都从缓存读取，加载的是"垃圾数据"，Opus 解码器完全无法工作。

### 修复方案

在初始化 SDK 前，用 `setConfigData` 手动指定正确的 WASM 路径，同时将缓存版本号升级到 2，强制清除旧缓存：

```ts
setConfigData([
  {
    id: WL_ConfigID.WL_RES_DATA_OPUS_WASM_ID,
    url: '/opuslibs.wasm', // Vite public/ 目录下的正确路径
    version: 2, // 版本号升级，强制刷新 IndexedDB 缓存
  },
])
```

同时将真正有效的 `opuslibs.wasm` 文件（1016427 字节）复制到 `playgrounds/vue3/public/` 目录。

---

## Bug 3：消息端口未启动，OPEN_RSP 永远收不到（根本原因）

### 原因

这是导致 `请求超时 1` 错误的**直接根本原因**，也是最难排查的一个。

Web Audio API 中，`AudioWorkletNode` 和 worklet 处理器之间通过 `MessagePort`（即 `node.port`）传递消息。`MessagePort` 有一个不太常见的行为：

- 使用 `port.onmessage = handler` 赋值时，会**自动调用** `port.start()`，消息开始投递
- 使用 `port.addEventListener('message', handler)` 时，**不会自动调用** `port.start()`，需要手动调用

SDK 源码中（`packages/core/src/audio/weila_audio.ts`，第 207 行和 499 行）使用的是 `addEventListener` 方式，但**没有** `port.start()`。

结果：worklet 确实创建了，也确实在运行，但 worklet 发出的 `OPEN_RSP` 消息永远无法到达主线程，SDK 内部的 5 秒超时计时器到期后触发 `请求超时 1`。

### 修复方案

由于我们无法修改 `packages/core/` 中的 SDK 源码，在 Vite playground 的入口文件 `main.ts` 中通过 monkey-patch `AudioWorkletNode` 构造函数，在每次创建节点后立即调用 `port.start()`：

```js
const OrigAudioWorkletNode = window.AudioWorkletNode

window.AudioWorkletNode = function AudioWorkletNode(ctx, name, opts) {
  const node = new OrigAudioWorkletNode(ctx, name, opts)
  node.port.start() // 手动启动消息投递，弥补 addEventListener 的不足
  return node
}

window.AudioWorkletNode.prototype = OrigAudioWorkletNode.prototype
```

---

## 修复效果

| Bug   | 现象                                 | 根本原因                                 | 修复方式                                             | Commit    |
| ----- | ------------------------------------ | ---------------------------------------- | ---------------------------------------------------- | --------- |
| Bug 1 | Worklet 模块无法加载                 | Blob URL 内无法解析相对 import           | 顺序计数器重定向到 IIFE 格式 worklet                 | `7fa2a92` |
| Bug 2 | Opus 解码器损坏，IndexedDB 缓存 HTML | Vite 对不存在路径返回 200 + HTML         | `setConfigData` 指定正确路径 + 升级缓存版本          | `ebc2785` |
| Bug 3 | `请求超时 1`，音频始终无声           | `addEventListener` 不自动 `port.start()` | Patch `AudioWorkletNode` 构造函数调用 `port.start()` | `67ad353` |

修复后，PTT 语音消息（会话 194343 "相约星期天"）可以正常播放，无任何超时错误。

---

## 清理工作

修复过程中曾尝试通过 Vite 插件（`vite-plugin-audio-worklet.ts`、`vite-plugin-weila-sdk.ts`）解决 worklet 加载问题，最终因复杂度高、效果不理想而放弃，改用 monkey-patch 方案。

这两个实验性文件已在 commit `6b035d0` 中删除，保持代码库整洁。

---

## 关键经验

1. **Vite 的 404 行为**：Vite 开发服务器对任何未匹配路径都返回 `index.html`（HTTP 200），这会让 SDK 误以为资源下载成功，实际拿到的是 HTML。生产环境一定要验证静态资源路径。

2. **MessagePort 的 `start()` 陷阱**：`addEventListener` 和 `onmessage` 看起来等效，但前者需要手动 `port.start()`，这是 Web Audio API 规范中相对隐蔽的细节，官方文档中有说明但容易被忽略。

3. **IndexedDB 版本管理**：缓存版本号一旦写入就难以清除，务必在资源更新时同步升级版本号，否则脏数据会一直存在。
