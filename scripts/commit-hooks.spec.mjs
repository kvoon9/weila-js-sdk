import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

void test('pre-commit runs nano-staged through simple-git-hooks', () => {
  assert.equal(manifest['simple-git-hooks']['pre-commit'], 'pnpm exec nano-staged')
  assert.equal(manifest.scripts.prepare, 'simple-git-hooks')
})

void test('staged code runs oxlint and oxfmt --check', () => {
  const code = manifest['nano-staged']['*.{js,jsx,ts,tsx,mjs,cjs,vue}']
  assert.deepEqual(code, ['oxlint --type-aware', 'oxfmt --check'])
  assert.equal(
    manifest['nano-staged']['*.{json,jsonc,md,mdx,css,pcss,html,yml,yaml}'],
    'oxfmt --check',
  )
})

void test('lint-staged is fully removed', () => {
  assert.equal(manifest['lint-staged'], undefined)
  assert.equal(manifest.devDependencies['lint-staged'], undefined)
})
