# Weila SDK Monorepo Agent Guide

## Project Overview
This monorepo contains the Weila Web SDK and its related packages. The project is managed using pnpm workspaces and follows the `@weilasdk` scope.

## Package Manager
- **Tool**: pnpm
- **Node Version**: ≥ 18
- **pnpm Version**: ≥ 9
- **Lockfile**: `pnpm-lock.yaml` (root)

Settings in `.npmrc`:
- `shamefully-hoist=true`
- `strict-peer-dependencies=false`

## Monorepo Structure
```
wl-js-sdk/
├── packages/
│   ├── core/        # @weilasdk/core  — TypeScript SDK (Webpack 5)
│   └── ui/          # @weilasdk/ui    — Vue 3 组件库 (tsdown + unplugin-vue)
├── playgrounds/
│   └── vue3/        # @weilasdk/playground-vue3 — Vue3 + Vite dev environment
├── .agents/skills/  # Agent skills (repo-level)
├── .claude/skills/  # Claude skills (repo-level)
├── skills-lock.json
├── weilasdk-integration.skill
├── tsconfig.base.json  # Shared TS config
└── pnpm-workspace.yaml
```

## Common Commands
Run these commands from the root directory using pnpm:

- **Install all dependencies**:
  ```bash
  pnpm install
  ```
- **Build core SDK**:
  ```bash
  pnpm --filter @weilasdk/core run build
  ```
- **Run Vue3 playground in dev mode**:
  ```bash
  pnpm --filter @weilasdk/playground-vue3 run dev
  ```
- **Type check all packages**:
  ```bash
  pnpm -r run typecheck
  ```
- **Build all packages**:
  ```bash
  pnpm run build
  ```

## Package Descriptions

### @weilasdk/core
The primary TypeScript SDK for the Weila communication platform. It handles WebSocket networking, audio processing (Opus), protobuf messaging, and IndexedDB storage. It outputs UMD bundles using Webpack 5.

### @weilasdk/ui
Vue 3 component library built with tsdown and unplugin-vue. Outputs ESM/CJS bundles with extracted CSS and full TypeScript declarations. See `packages/ui/README.md` for details.

### @weilasdk/playground-vue3
A development environment using Vue 3.5 and Vite 6. It includes pre-configured proxy settings for Weila API endpoints (V1, Audio, Avatar, and PTT).

## Inter-package Dependencies
Packages within the monorepo depend on each other using the `workspace:*` protocol. For example, both `ui` and `playground-vue3` list `@weilasdk/core` as a dependency via `workspace:*`.

## Shared Config
- **TypeScript**: Shared compiler options are defined in `tsconfig.base.json`. Individual packages extend this configuration.
- **npm**: Workspace-wide npm settings are defined in `.npmrc`.

## Workspace .gitignore
The following patterns are excluded at the root level:
- `node_modules/`
- `dist/`
- `*.tgz`
- `.DS_Store`
- `.env` and `.env.*` (excluding `.env.example`)
- `.agents/skills/.venv`

## For Agents
This file provides a high-level overview of the monorepo structure and workspace operations. For detailed information regarding the SDK's internal code style, directory structure, naming conventions, and specific implementation details, refer to:

**`packages/core/AGENTS.md`**
