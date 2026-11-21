import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), '..')

void test('the built bundle carries the current git short SHA', () => {
  const source = readFileSync(join(PACKAGE, 'dist/weilasdk.mjs'), 'utf8')

  const expected = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: PACKAGE })
    .toString()
    .trim()

  assert.match(source, /WL_BUILD_ID/)
  assert.ok(source.includes(expected), `bundle does not carry the head SHA ${expected}`)
})
