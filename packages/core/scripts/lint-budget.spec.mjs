import assert from 'node:assert/strict'
import test from 'node:test'
import { collect, compareBudget, totalWarnings } from './lint-budget.mjs'

void test('collect counts errors and warnings by file', () => {
  const result = collect(
    [
      { severity: 'error', filename: '/repo/packages/core/a.ts' },
      { severity: 'warning', filename: '/repo/packages/core/a.ts' },
      { severity: 'warning', filename: '/repo/packages/core/a.ts' },
      { severity: 'warning', filename: '/repo/packages/core/b.ts' },
    ],
    '/repo',
  )
  assert.equal(result.errors, 1)
  assert.deepEqual(result.files, { 'packages/core/a.ts': 2, 'packages/core/b.ts': 1 })
  assert.equal(totalWarnings(result), 3)
})

void test('compareBudget passes at the baseline', () => {
  const current = { errors: 0, files: { 'packages/core/a.ts': 2 } }
  assert.deepEqual(compareBudget(current, current, current), [])
})

void test('compareBudget reports an increase and a new file', () => {
  const current = { errors: 0, files: { 'packages/core/a.ts': 3, 'packages/core/new.ts': 1 } }
  const budget = { errors: 0, files: { 'packages/core/a.ts': 2 } }
  assert.deepEqual(compareBudget(current, budget, null), [
    'packages/core/a.ts has 3 warnings, budget 2',
    'packages/core/new.ts has 1 warnings, budget 0',
  ])
})

void test('compareBudget rejects a budget raised over origin/main', () => {
  const current = { errors: 0, files: { 'packages/core/a.ts': 2 } }
  const raised = { errors: 0, files: { 'packages/core/a.ts': 5 } }
  const origin = { errors: 0, files: { 'packages/core/a.ts': 3 } }
  assert.deepEqual(compareBudget(current, raised, origin), [
    'the committed warning budget is higher than origin/main',
  ])
})
