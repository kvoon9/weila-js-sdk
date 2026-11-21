import assert from 'node:assert/strict'
import test from 'node:test'
import { compareBudget, countDiagnostics, countSuppressions } from './strict-budget.mjs'

void test('countDiagnostics counts TypeScript error lines', () => {
  const output = 'src/a.ts(1,2): error TS2322: bad\nsrc/b.ts(3,4): error TS2531: worse\n'
  assert.equal(countDiagnostics(output), 2)
})

void test('countSuppressions counts every TypeScript suppression directive', () => {
  const source = '// @ts-ignore\n// @ts-expect-error\n/* @ts-nocheck */\n'
  assert.equal(countSuppressions(source), 3)
})

void test('compareBudget passes at the baseline', () => {
  const current = { diagnostics: 922, suppressions: 10 }
  assert.deepEqual(compareBudget(current, current, null), [])
})

void test('compareBudget reports an increase and a raised origin', () => {
  const current = { diagnostics: 923, suppressions: 11 }
  const budget = { diagnostics: 922, suppressions: 10 }
  assert.deepEqual(compareBudget(current, budget, { diagnostics: 900, suppressions: 10 }), [
    '923 strict diagnostics, budget 922',
    '11 TypeScript suppressions, budget 10',
    'strict diagnostics went up against origin/main (900)',
  ])
})
