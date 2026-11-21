#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), '..')
const REPO = join(PACKAGE, '..', '..')
const BUDGET = join(PACKAGE, 'artifacts/lint-budget.json')

export function collect(diagnostics, base = REPO) {
  const files = {}
  let errors = 0
  for (const diagnostic of diagnostics) {
    const path = relative(base, diagnostic.filename ?? '')
    if (diagnostic.severity === 'error') errors++
    else files[path] = (files[path] ?? 0) + 1
  }
  return { errors, files }
}

export function totalWarnings(budget) {
  return Object.values(budget.files ?? {}).reduce((sum, count) => sum + count, 0)
}

export function compareBudget(current, budget, origin) {
  const problems = []
  if (current.errors > 0) problems.push(`${current.errors} lint errors`)
  if (origin && totalWarnings(origin) < totalWarnings(budget))
    problems.push('the committed warning budget is higher than origin/main')
  for (const [path, count] of Object.entries(current.files)) {
    const allowed = budget.files[path] ?? 0
    if (count > allowed) problems.push(`${path} has ${count} warnings, budget ${allowed}`)
  }
  return problems
}

function runLint() {
  try {
    const output = execFileSync(
      join(REPO, 'node_modules/.bin/oxlint'),
      ['--type-aware', '--format', 'json', '.'],
      {
        cwd: REPO,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
    return JSON.parse(output)
  } catch (error) {
    return JSON.parse(error.stdout || '{}')
  }
}

function budgetFromOrigin() {
  try {
    const raw = execFileSync(
      'git',
      ['show', 'origin/main:packages/core/artifacts/lint-budget.json'],
      {
        cwd: REPO,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function main() {
  const current = collect(runLint().diagnostics ?? [])
  if (process.argv.includes('--write')) {
    mkdirSync(dirname(BUDGET), { recursive: true })
    writeFileSync(BUDGET, `${JSON.stringify(current, null, 2)}\n`)
    console.log(
      `Wrote ${relative(REPO, BUDGET)} with ${current.errors} errors and ${totalWarnings(current)} warnings.`,
    )
    return
  }

  const problems = []
  if (!existsSync(BUDGET))
    problems.push(`Missing ${relative(REPO, BUDGET)}. Run with --write first.`)
  else
    problems.push(
      ...compareBudget(current, JSON.parse(readFileSync(BUDGET, 'utf8')), budgetFromOrigin()),
    )

  console.log(
    `Lint budget: ${current.errors} errors, ${totalWarnings(current)} warnings across ${Object.keys(current.files).length} files.`,
  )
  for (const problem of problems) console.error(problem)
  process.exitCode = problems.length ? 1 : 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
