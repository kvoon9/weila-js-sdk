import { defineConfig } from 'tsdown'
import { execSync } from 'node:child_process'
import Vue from 'unplugin-vue/rolldown'

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
      execSync(
        'cat dist/tailwind.css dist/index.css > dist/merged.css && mv dist/merged.css dist/index.css && rm dist/tailwind.css',
      )
    },
  },
})
