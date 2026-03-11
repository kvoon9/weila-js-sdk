# Learnings — fix-audio-monkey-patch

## [2026-03-11] Session ses_32517ef22ffesJgmfGOUM79cTP — Plan Start

### Root Cause (CONFIRMED)

- `AudioContext.prototype.addModule` does NOT exist — `addModule` lives on `AudioWorklet.prototype` (inherited from `Worklet.prototype`)
- The `if (originalAddModule)` guard is ALWAYS false → the entire monkey-patch block never executes
- SDK creates blob: URLs for worklets via webpack worklet-loader (inline: true), Module 9434 in compiled bundle
- Blob: URLs cannot resolve relative ES module imports (`import opus from './opus'`) — import fails silently
- Failure chain: blob URL → import fails → worklet never initializes → no OPEN_RSP → 5s timeout → "请求超时 1"

### TWO Bugs, Not One

1. Wrong prototype target: `AudioContext.prototype` → should be `AudioWorklet.prototype`
2. Wrong URL matching: `moduleURL.split('/').pop()` on `blob:https://localhost:5173/uuid` returns `uuid`, not a filename

### Fix Strategy

- Use `AudioWorklet.prototype.addModule` (NOT `Worklet.prototype` — too broad)
- Use `moduleURL.startsWith('blob:')` for blob detection (not filename parsing)
- Use sequential counter (player=0, recorder=1) since SDK always calls in that order
- Keep filename-based fallback for non-blob URLs

### Codebase Facts

- IIFE worklet files already exist in `public/`: `weila_player.worklet.iife.js`, `weila_recorder.worklet.iife.js`, `opuslibs.wasm`
- Two unused Vite plugins exist: `vite-plugin-weila-sdk.ts` (59 lines), `vite-plugin-audio-worklet.ts` (65 lines) — neither registered in vite.config.ts
- SDK calls `addModule` exactly twice in order: PlayerWorklet (line 101), RecorderWorklet (line 102) in `weila_audio.ts`
- Dev server runs on port 5173

### Blob URL Format

Confirmed: `blob:https://localhost:5173/{uuid}` (from Module 9434 analysis)

## [2026-03-11] Session (Bug 2 Root Cause — CONFIRMED)

### True Root Cause of `请求超时 1`

The IIFE worklet receives only 450 bytes of `wasmData` instead of ~993KB. Confirmed via:

- `AudioWorkletNode` interceptor: `wasmData length: 450`
- IndexedDB `WeilaConfigDB.configTable[4].resource_data.length === 450`
- First 100 bytes: `<!doctype html>...` — it's Vite's HTML fallback!

### The URL Mismatch

- SDK webpack bundle uses `__webpack_require__.p = '/'` + `'assets/opuslibs.wasm'` = `/assets/opuslibs.wasm`
- Vite dev server has NO static file at `/assets/opuslibs.wasm`
- Vite returns its SPA HTML fallback (status 200!) for unknown routes
- SDK's `fetchUrl` only checks `readyState === XMLHttpRequest.DONE`, not status code
- So SDK stores 450-byte HTML as 'WASM data' in IndexedDB with version=1
- IndexedDB version check keeps using the cached bad data on subsequent loads

### Working URLs

- `/opuslibs.wasm` → 200, 1016427 bytes (correct) — file is in `public/opuslibs.wasm`
- `/@fs/Users/kvoon/weila/wl-js-sdk/packages/core/dist/assets/opuslibs.wasm` → 200, application/wasm

### The Fix

In `playgrounds/vue3/src/main.ts`, import `setConfigData` and `WL_ConfigID` from SDK,
then call `setConfigData([{ id: WL_ConfigID.WL_RES_DATA_OPUS_WASM_ID, url: '/opuslibs.wasm', version: 2 }])`
BEFORE the app mounts. Version 2 forces SDK to re-fetch (invalidates cached HTML garbage).

Also need to clear stale IndexedDB cache — easiest: set version to 2 in setConfigData so SDK re-fetches automatically.

### Import Path for setConfigData

Check: `import { setConfigData, WL_ConfigID } from '@weilasdk/core'` or check how weila store does it.
In `playgrounds/vue3/src/stores/weila.ts` check the import pattern.

## [2026-03-11] Bug 3 Root Cause — AudioWorkletNode MessagePort not delivering messages

### Root Cause (CONFIRMED — commit 67ad353)

- SDK uses `port.addEventListener('message', handler)` at `packages/core/src/audio/weila_audio.ts` lines 207-210 and 499
- Web Audio API `MessagePort` requires an **explicit `port.start()`** call to begin delivering messages when using `addEventListener`
- Setting `port.onmessage = handler` implicitly calls `port.start()`, but `addEventListener` does NOT
- Without `port.start()`, the worklet's `OPEN_RSP` message never arrives on the main thread
- Result: 5-second timeout fires → "请求超时 1" error

### How Bug 3 Was Found

- Installed an AWN (AudioWorkletNode) interceptor in the browser via Playwright `page.evaluate()` that set `node.port.onmessage = ...`
- With the interceptor: audio played ✅ — OPEN_RSP received with `result: true`
- Without the interceptor (fresh page reload): `请求超时 1` ❌
- The interceptor's `node.port.onmessage =` assignment was the **accidental fix** — it auto-started the port

### The Fix (main.ts lines 49-64)

Added a monkey-patch that overrides `window.AudioWorkletNode` constructor to call `node.port.start()` after every node creation.
Prototype is preserved: `window.AudioWorkletNode.prototype = OrigAudioWorkletNode.prototype`

### Verification

- Fresh page reload → click `5"` audio → WORKS ✅
- No `请求超时 1` ✅
- Full playback flow confirmed: OPEN_RSP → START → last frame → STOP → CLOSE ✅
- Only `播放铃声失败` errors remain (ring tone start/stop — separate issue, low priority)
