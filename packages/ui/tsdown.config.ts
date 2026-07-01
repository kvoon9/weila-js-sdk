import { defineConfig } from 'tsdown'
import { execSync } from 'node:child_process'
import Vue from 'unplugin-vue/rolldown'

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['esm', 'cjs'],
  platform: 'neutral',
  dts: { vue: true },
  plugins: [Vue({ isProduction: true })],
  external: ['vue', '@vois/weila-sdk-core'],
  hooks: {
    'build:done'() {
      execSync('node scripts/build-css.mjs', { stdio: 'inherit' })
      execSync('cp -r src/components/Emoji/assets dist/')
    },
  },
})
