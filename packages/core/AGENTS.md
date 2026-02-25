# AGENTS.md - Weila SDK Development Guide

## Project Overview

**微喇网页SDK (Weila Web SDK)** - A TypeScript-based SDK for Weila communication platform with WebSocket networking, audio processing, protobuf messaging, and IndexedDB storage.

**Package Manager**: pnpm (pnpm-lock.yaml in monorepo root)
**Build Tool**: Webpack 5 with TypeScript
**Language**: TypeScript (target: ESNext, strict mode: disabled)

---

## Build Commands

### Production Build

```bash
pnpm run build
```

Builds SDK bundle with webpack in production mode (no source maps).
Output: `dist/weilasdk.js`, `dist/weilasdk_data.js`, `dist/weilasdk_log.js`, `dist/weilasdk.d.ts`

### Development Build

```bash
pnpm run build:dev
```

Builds SDK with source maps for debugging.
Output written to sibling project path (configured in webpack).

### Type Checking

```bash
pnpm exec tsc --noEmit
```

Run TypeScript compiler for type checking without emitting files.

### Testing

**No test framework configured.** The `pnpm test` script is a placeholder that exits with error.

---

## Project Structure

```
packages/core/
├── src/
│   ├── audio/          # Audio processing, Web Audio API, Opus encoding
│   ├── database/       # Dexie (IndexedDB) for local storage
│   ├── fsm/            # XState finite state machine definitions
│   ├── log/            # Debug logging utilities
│   ├── main/           # Core SDK logic, modules, networking
│   ├── proto/          # Protobuf message wrappers and utilities
│   ├── assets/         # Binary resources (WASM, audio files)
│   ├── weilasdk.ts     # Main SDK entry point
│   ├── weilasdk_data.ts
│   ├── weilasdk_log.ts
│   └── weila_compile_config.ts
├── public/             # Static assets copied post-install
├── dist/               # Build output (UMD bundles)
├── test/               # Empty test directory
├── .env                # Environment variables
├── tsconfig.json       # TypeScript configuration
└── webpack.config.js   # Webpack build configuration
```

### Module Path Aliases

Configured in both `tsconfig.json` and `webpack.config.js`:

- `fsm/*` → `src/fsm/*`
- `log/*` → `src/log/*`
- `main/*` → `src/main/*`
- `db/*` → `src/database/*`
- `proto/*` → `src/proto/*`
- `audio/*` → `src/audio/*`

**Always use these aliases** for imports within the project.

---

## Code Style Guidelines

### Naming Conventions

- **Variables/Functions**: `camelCase` (e.g., `weila_init`, `sendPbMsg`, `processSendingPbMsg`)
- **Classes/Interfaces/Types**: `PascalCase` (e.g., `WeilaCore`, `WL_IDbUserInfo`, `WLPlayerState`)
- **Constants/Enums**: `SCREAMING_SNAKE_CASE` (e.g., `WL_DB_MSG_DATA_STATUS_ERR`)
- **Prefixes**: Weila-specific types/interfaces use `WL_` prefix (e.g., `WL_PbMsgData`, `WL_LoginParam`)

### Import Organization

Organize imports in this order (do NOT alphabetize within groups):

1. **External libraries** (npm packages like 'xstate', 'dexie', 'long')
2. **Internal types/interfaces** (grouped by source file)
3. **Internal modules** (using path aliases like 'main/', 'proto/', 'db/')

Example:

```typescript
// External libraries
import { interpret } from 'xstate';
import Long from 'long';

// Internal types
import { WL_CoreInterface, WL_LoginParam, WL_LoginResult } from 'main/weila_internal_data';

// Internal modules
import { getLogger } from 'log/weila_log';
import { WLConfig } from 'main/weila_config';
```

### TypeScript Style

- **Explicit typing**: Always provide type annotations for function parameters and return types
- **Interfaces over types**: Use `interface` for object shapes, reserve `type` for unions/intersections
- **No implicit any**: Even though strict mode is disabled, avoid implicit `any` types
- **Generics**: Use for collections (`Promise<boolean>`, `Map<number, T>`)
- **No type suppression**: Avoid `as any`, `@ts-ignore` except for edge cases (like web worker imports)

### Function Declarations

- **Class methods**: Use `function` keyword with visibility modifiers (`public`, `private`)
- **Callbacks/inline functions**: Use arrow functions
- **Async operations**: Prefer `async/await` over raw Promises

Example:

```typescript
// Class method
public async weila_init(): Promise<boolean> {
    // ...
}

// Callback
callback.resolve = (value: any) => {
    // ...
};
```

### Error Handling

- **try/catch**: Wrap async operations and potential failures
- **Error logging**: Use `wlerr()` (from log module) before rejecting/throwing
- **Promise rejection**: Return `Promise.reject(new Error(message))` for async failures
- **Error message format**: Structured strings like `"RET_CODE:${code}-MESSAGE:${msg}:END"`
- **No custom error classes**: Use standard `Error` objects

Example:

```typescript
try {
  await WLConfig.loadResource();
  callback.resolve(true);
} catch (e) {
  wlerr('加载数据失败', e);
  callback.reject(e);
}
```

### Comments

- **JSDoc**: Required for public API methods with `@param` and `@returns`
- **Inline comments**: Use `//` for explanations (Chinese acceptable for internal logic)
- **Keep brief**: Explain "why", not "what" (code should be self-documenting)

Example:

```typescript
/**
 * 注册微喇SDK的事件回调函数，所有的SDK外发信息都会发到这个回调函数中去
 * @param callback 事件回调函数，回调的事件在weila_external_data.d.ts定义
 */
public weila_onEvent(callback: WL_ExtEventCallback): void {
    this.emitter.on('ext_event', callback);
}
```

---

## Special Considerations

### Web Workers

- Worker files use `.worker.ts` suffix (e.g., `weila_network.worker.ts`)
- Import with `@ts-ignore` directive: `// @ts-ignore\nimport Network from 'main/weila_network.worker';`
- Configured with `worker-loader` in webpack

### Worklets (Audio)

- Worklet files use `.worklet.js` suffix
- Configured with `worklet-loader` (inline: true)

### Binary Assets

- WASM files (`.wasm`) and audio files (`.wav`) loaded as `asset/resource`
- Placed in `src/assets/` directory
- Webpack outputs to `dist/assets/[name][ext]`

### Environment Variables

- Loaded via `dotenv-webpack` plugin
- Defined in `.env` file (not committed to git)
- Accessible via `process.env.VARIABLE_NAME`

---

## Integration Guidelines

### For VUE 2/3 Projects

- Use `markRaw()` to wrap WeilaCore instance (avoid Proxy wrapping)
- Import dynamically: `const weilaModule = await import('weilasdk');`
- Initialize logger: `initLogger('MOD:*, CORE:*, FSM:*, AUDIO:*, DB:*, NET:*, -socket-client:*');`

### For UniApp Projects

1. Copy `public/assets/` resources to `static/weilasdk/`
2. Call `setConfigData()` before WeilaCore initialization to remap asset paths
3. Add webpack rule for `.wasm` files using `file-loader`

### Proxy Configuration

Required API endpoints:

- `/v1` → `http://webapi.weila.hk:8080/`
- `/audio` → `https://weilaaudio.oss-cn-shenzhen.aliyuncs.com`
- `/avatar` → `https://weilaavatar.oss-cn-shenzhen.aliyuncs.com`
- `/ptt` → `https://weilaspeech.oss-cn-shenzhen.aliyuncs.com`

---

## Common Tasks

### Adding New Modules

1. Create module file in `src/main/` (e.g., `weila_new_module.ts`)
2. Define module class extending base behavior
3. Import and initialize in `weila_core.ts`
4. Export public API in module and re-export in `weilasdk.ts`

### Updating Protobuf Definitions

1. Modify proto files in `src/proto/proto_raws/`
2. Regenerate `weilapb.js` and `weilapb.d.ts` with protobuf compiler
3. Update wrappers in `src/proto/weilapb_*_wrapper.ts` if message structure changed

### Adding Database Tables

1. Define interface in `src/database/weila_db_data.ts` (prefix with `WL_IDb`)
2. Add table schema in `src/database/weila_db.ts` (extend WeilaDB class)
3. Use Dexie API for queries (`.where()`, `.toArray()`, `.put()`, etc.)

---

## Verification Checklist

Before committing changes:

- [ ] TypeScript compiles without errors (`pnpm exec tsc --noEmit`)
- [ ] Production build succeeds (`pnpm run build`)
- [ ] Development build succeeds (`pnpm run build:dev`)
- [ ] No `@ts-ignore` added without justification
- [ ] Public APIs have JSDoc comments
- [ ] Import paths use configured aliases (not relative paths like `../../`)
- [ ] Error handling includes logging with `wlerr()`
- [ ] No console.log left in code (use debug logger instead)
