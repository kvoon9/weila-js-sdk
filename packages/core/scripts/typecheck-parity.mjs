#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const KNOWN = join(PACKAGE, 'artifacts/typecheck-known-differences.json')

function loadedTypeScriptVersion(fromPackage) {
  const entry = require.resolve(fromPackage, { paths: [PACKAGE] })

  return createRequire(entry)('typescript/package.json').version
}

function run(binary, args) {
  try {
    const output = execFileSync(join(PACKAGE, 'node_modules/.bin', binary), args, {
      cwd: PACKAGE,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    return { status: 0, output }
  } catch (error) {
    return { status: error.status ?? 1, output: `${error.stdout ?? ''}${error.stderr ?? ''}` }
  }
}

function diagnostics(output) {
  return [...output.matchAll(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm)]
    .map((match) => `${match[1]}(${match[2]},${match[3]}) ${match[4]} ${match[5]}`)
    .sort()
}

const problems = []
const coreTypeScript = require(join(PACKAGE, 'node_modules/typescript/package.json')).version

if (!coreTypeScript.startsWith('7.'))
  problems.push(`core resolves typescript ${coreTypeScript}, expected 7.x`)

for (const tool of ['vue-tsc', 'tsdown']) {
  const version = loadedTypeScriptVersion(tool)

  if (!version.startsWith('6.'))
    problems.push(`${tool} resolves typescript ${version}, expected 6.x`)
}

const tsrs = run('tsrs', ['--noEmit', '--fast'])
const tsc = run('tsc', ['--noEmit'])
const tsrsDiagnostics = diagnostics(tsrs.output)
const tscDiagnostics = diagnostics(tsc.output)

if (tsrs.status !== 0 && tsrsDiagnostics.length === 0)
  problems.push(`tsrs exited ${tsrs.status} without diagnostics`)

if (tsc.status !== 0 && tscDiagnostics.length === 0)
  problems.push(`tsc exited ${tsc.status} without diagnostics`)

const known = existsSync(KNOWN) ? JSON.parse(readFileSync(KNOWN, 'utf8')) : []
const expected = new Set(known)

for (const entry of tscDiagnostics) {
  if (!tsrsDiagnostics.includes(entry) && !expected.has(entry))
    problems.push(`tsrs missed ${entry}`)
}

for (const entry of tsrsDiagnostics) {
  if (!tscDiagnostics.includes(entry) && !expected.has(entry))
    problems.push(`tsrs reported ${entry} but tsc did not`)
}

console.log(
  `core typescript ${coreTypeScript}, tsrs diagnostics ${tsrsDiagnostics.length}, tsc diagnostics ${tscDiagnostics.length}`,
)

for (const problem of problems) console.error(problem)

process.exitCode = problems.length ? 1 : 0
