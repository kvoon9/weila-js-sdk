import { defineConfig } from 'tsdown'
import Vue from 'unplugin-vue/rolldown'

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['esm', 'cjs'],
  platform: 'neutral',
  dts: { vue: true },
  plugins: [Vue({ isProduction: true })],
  external: ['vue', '@weilasdk/core'],
})
