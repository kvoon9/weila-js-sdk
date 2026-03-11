// NOTE: This plugin is not registered in vite.config.ts and is currently unused.
// The monkey-patch in src/main.ts handles AudioWorklet loading instead.

// vite-plugin-audio-worklet.ts
import type { Plugin } from 'vite'

/**
 * Vite 插件：处理 AudioWorklet 文件
 *
 * 使用方式：
 * 1. 将 worklet 文件放在项目中
 * 2. 在 vite.config.ts 中添加此插件
 * 3. 使用 new URL('./worklet.js', import.meta.url) 获取 URL
 */
export function audioWorkletPlugin(): Plugin {
  return {
    name: 'vite-plugin-audio-worklet',

    // 配置解析时
    config() {
      return {
        optimizeDeps: {
          // 排除 SDK，避免被预构建
          exclude: ['@weilasdk/core'],
        },
      }
    },

    // 解析 ID
    resolveId(id) {
      // 处理 worklet 文件
      if (id.endsWith('.worklet.js') || id.endsWith('.worklet.ts')) {
        return id
      }
      return null
    },

    // 加载模块
    load(id) {
      if (id.endsWith('.worklet.js') || id.endsWith('.worklet.ts')) {
        // 返回特殊标记，让 Vite 处理为 Worker
        return null // 让 Vite 默认处理
      }
      return null
    },

    // 转换代码 - 将 import 转换为 self-contained
    transform(code, id) {
      if (!id.includes('.worklet.')) {
        return null
      }

      console.log('[AudioWorklet Plugin] Transforming:', id)

      // AudioWorklet 需要的是普通 JS，不是 ESM
      // 但 Vite 默认会处理依赖打包
      // 这里我们不需要做太多转换，因为 Vite 会自动处理

      return {
        code,
        // 标记为 ES 模块
        moduleType: 'js',
      }
    },
  }
}

export default audioWorkletPlugin
