import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  assetsInclude: ['**/*.wasm'],
  server: {
    port: 5173,
    proxy: {
      '/v1': {
        target: 'http://webapi.weila.hk:8080/',
        changeOrigin: true,
      },
      '/audio': {
        target: 'https://weilaaudio.oss-cn-shenzhen.aliyuncs.com',
        changeOrigin: true,
      },
      '/avatar': {
        target: 'https://weilaavatar.oss-cn-shenzhen.aliyuncs.com',
        changeOrigin: true,
      },
      '/ptt': {
        target: 'https://weilaspeech.oss-cn-shenzhen.aliyuncs.com',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    host: true,
    https: {
      cert: './localhost.pem',
      key: './localhost-key.pem',
    },
  },
})
