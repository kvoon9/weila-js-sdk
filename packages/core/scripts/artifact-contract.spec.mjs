import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  collectArtifacts,
  compareContract,
  parseDtsExports,
  parseEsmExports,
} from './artifact-contract.mjs'

const baseline = {
  entry: 'weilasdk.mjs',
  exports: ['WeilaCore', 'setConfigData'],
  dtsExports: ['WeilaCore'],
  assets: ['opuslibs.wasm'],
  files: {
    'weilasdk.mjs': { bytes: 1, sha256: 'a' },
    'assets/opuslibs.wasm': { bytes: 1, sha256: 'b' },
  },
}

void test('parseEsmExports reads named and declared exports', () => {
  const source =
    'export{WeilaCore,setConfigData as configure};export const WL_BUILD_ID="x";export function helper(){}'

  assert.deepEqual(parseEsmExports(source), ['WL_BUILD_ID', 'WeilaCore', 'configure', 'helper'])
})

void test('parseDtsExports reads interfaces, types, and re-exports', () => {
  const source =
    "export interface WL_Options {}\nexport type ID = string\nexport { WeilaCore } from './main/weila_core'\nexport type { WL_InitOptions } from './main/weila_core'"

  assert.deepEqual(parseDtsExports(source), ['ID', 'WL_InitOptions', 'WL_Options', 'WeilaCore'])
})

void test('compareContract ignores additions and reports removals', () => {
  const current = {
    ...baseline,
    exports: [...baseline.exports, 'WL_BUILD_ID'],
    files: { ...baseline.files, 'extra.mjs': { bytes: 1, sha256: 'c' } },
  }

  assert.deepEqual(compareContract(baseline, current), [])

  const missing = {
    ...baseline,
    exports: ['WeilaCore'],
    dtsExports: [],
    assets: [],
    files: { 'weilasdk.mjs': baseline.files['weilasdk.mjs'] },
  }

  assert.deepEqual(compareContract(baseline, missing), [
    'missing file assets/opuslibs.wasm',
    'missing export setConfigData',
    'missing d.ts export WeilaCore',
    'missing asset opuslibs.wasm',
  ])
})

void test('collectArtifacts refuses a dist without the entry', () => {
  const directory = mkdtempSync(join(tmpdir(), 'weila-contract-'))

  try {
    assert.throws(() => collectArtifacts(directory), /Missing .*weilasdk\.mjs/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
