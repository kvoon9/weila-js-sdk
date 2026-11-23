import { copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const playground = dirname(dirname(fileURLToPath(import.meta.url)))
const worklets = join(playground, '../../packages/core/dist/worklets')

for (const name of ['weila_player.worklet.iife.js', 'weila_recorder.worklet.iife.js']) {
  copyFileSync(join(worklets, name), join(playground, 'public', name))
  console.log(`synced ${name}`)
}
