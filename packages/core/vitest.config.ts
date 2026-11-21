import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      audio: path.resolve(root, 'src/audio'),
      db: path.resolve(root, 'src/database'),
      fsm: path.resolve(root, 'src/fsm'),
      log: path.resolve(root, 'src/log'),
      main: path.resolve(root, 'src/main'),
      proto: path.resolve(root, 'src/proto'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    globals: true,
  },
})
