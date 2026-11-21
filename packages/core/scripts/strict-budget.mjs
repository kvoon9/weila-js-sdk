#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), '..')
const BUDGET = join(PACKAGE, 'artifacts/strict-budget.json')

export function countDiagnostics(output) {
  return [...output.matchAll(/error TS\d+:/g)].length
}

export function countSuppressions(source) {
  return [...source.matchAll(/@ts-(?:ignore|expect-error|nocheck)/g)].length
}

export function compareBudget(current, budget, origin) {
  const problems = []

  if (current.diagnostics > budget.diagnostics)
    problems.push(`${current.diagnostics} strict diagnostics, budget ${budget.diagnostics}`)

  if (current.suppressions > budget.suppressions)
    problems.push(`${current.suppressions} TypeScript suppressions, budget ${budget.suppressions}`)

  if (origin && current.diagnostics > origin.diagnostics)
    problems.push(`strict diagnostics went up against origin/main (${origin.diagnostics})`)

  return problems
}

function measure() {
  let output = ''
  let status = 0

  try {
    output = execFileSync(
      join(PACKAGE, 'node_modules/.bin/tsc'),
      ['--noEmit', '--strict', '--pretty', 'false'],
      {
        cwd: PACKAGE,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
  } catch (error) {
    output = `${error.stdout ?? ''}${error.stderr ?? ''}`
    status = error.status ?? 1
  }

  const diagnostics = countDiagnostics(output)

  if (status !== 0 && diagnostics === 0)
    throw new Error(
      `tsc exited ${status} without a diagnostic. Treating the measurement as broken.`,
    )

  const sources = execFileSync('git', ['ls-files', 'src'], { cwd: PACKAGE, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((path) => readFileSync(join(PACKAGE, path), 'utf8'))
    .join('\n')

  return { diagnostics, suppressions: countSuppressions(sources) }
}

function main() {
  const current = measure()

  if (process.argv.includes('--write')) {
    mkdirSync(dirname(BUDGET), { recursive: true })
    writeFileSync(BUDGET, `${JSON.stringify(current, null, 2)}\n`)
    console.log(
      `Wrote ${relative(PACKAGE, BUDGET)} with ${current.diagnostics} strict diagnostics and ${current.suppressions} suppressions.`,
    )

    return
  }

  const problems = []

  if (!existsSync(BUDGET))
    problems.push(`Missing ${relative(PACKAGE, BUDGET)}. Run with --write first.`)
  else problems.push(...compareBudget(current, JSON.parse(readFileSync(BUDGET, 'utf8')), null))

  console.log(
    `Strict budget: ${current.diagnostics} diagnostics, ${current.suppressions} suppressions.`,
  )

  for (const problem of problems) console.error(problem)
  process.exitCode = problems.length ? 1 : 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
