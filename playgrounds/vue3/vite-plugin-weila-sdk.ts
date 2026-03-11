// vite-plugin-weila-sdk.ts
import type { Plugin, ViteDevServer } from 'vite'

/**
 * Vite 插件：处理 Weila SDK 的 AudioWorklet 加载
 *
 * 这个插件做了两件事：
 * 1. 拦截 AudioWorklet 模块请求，重定向到 public 目录的 IIFE 文件
 * 2. 配置优化选项以正确处理 SDK
 */
export function weilaSdkPlugin(): Plugin {
  return {
    name: 'vite-plugin-weila-sdk',

    configureServer(server: ViteDevServer) {
      // 添加中间件来处理 worklet 请求
      server.middlewares.use((req, res, next) => {
        const url = req.url || ''

        // 处理 worklet 请求
        if (url.includes('weila_player.worklet') || url.includes('weila_recorder.worklet')) {
          // 重定向到 public 目录的 IIFE 文件
          if (url.includes('weila_player.worklet')) {
            console.log('[Weila SDK Plugin] Redirecting worklet request:', url)
            req.url = '/weila_player.worklet.iife.js'
          } else if (url.includes('weila_recorder.worklet')) {
            req.url = '/weila_recorder.worklet.iife.js'
          }
        }

        next()
      })
    },

    // 配置优化依赖
    config() {
      return {
        optimizeDeps: {
          // 排除 SDK，避免被预构建
          exclude: ['@weilasdk/core'],
        },
        // 确保 WASM 文件被正确处理
        assetsInclude: ['**/*.wasm'],
      }
    },

    // 转换模块 ID
    resolveId(id) {
      // 处理 SDK 中的 worklet 导入
      if (id.includes('weila_player.worklet.js') || id.includes('weila_recorder.worklet.js')) {
        // 返回一个虚拟 ID，让 Vite 继续处理
        return null
      }
      return null
    },
  }
}

export default weilaSdkPlugin
