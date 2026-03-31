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
      execSync('pnpm exec postcss src/style.postcss.css -o dist/tailwind.css')
      execSync('cat dist/tailwind.css dist/index.css > dist/merged.css')
      execSync('mv dist/merged.css dist/index.css && rm dist/tailwind.css')
      const fvCss = resolve(__dirname, 'node_modules/floating-vue/dist/style.css')
      execSync(`cat ${fvCss} >> dist/index.css`)
      execSync('cp -r src/components/Emoji/assets dist/')
    },
  },
})
