import { defineConfig } from 'tsdown'
import { execSync } from 'node:child_process'
import Vue from 'unplugin-vue/rolldown'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['esm', 'cjs'],
  platform: 'neutral',
  dts: { vue: true },
  plugins: [Vue({ isProduction: true })],
  external: ['vue', '@weilasdk/core'],
  hooks: {
    'build:done'() {
      // 生成 Tailwind CSS 并合并到 tsdown 产出的 index.css
      execSync('pnpm exec postcss src/style.postcss.css -o dist/tailwind.css')
      // 复制 floating-vue CSS
      const fvCss = resolve(__dirname, 'node_modules/floating-vue/dist/style.css')
      execSync(`cat dist/tailwind.css dist/index.css ${fvCss} > dist/merged.css && mv dist/merged.css dist/index.css && rm dist/tailwind.css`)
      // 复制 emoji 资源到 dist
      execSync('cp -r src/components/Emoji/assets dist/')
    },
  },
})
