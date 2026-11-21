#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(PACKAGE, 'dist')
const BASELINE = join(PACKAGE, 'artifacts', 'contract-baseline.json')
const ENTRY = 'weilasdk.mjs'
const LICENSE_SIDECAR = /\.LICENSE\.txt$/

export function parseEsmExports(source) {
  const names = new Set()
  for (const match of source.matchAll(/export\s*(?:type\s+)?\{([^}]*)\}/g)) {
    for (const part of match[1].split(',')) {
      const name = part.trim()
      if (name) names.add(name.split(/\s+as\s+/).pop())
    }
  }
  for (const match of source.matchAll(
    /export\s+(?:const|let|var|function|class)\s+([A-Za-z0-9_$]+)/g,
  ))
    names.add(match[1])
  return [...names].sort((a, b) => a.localeCompare(b))
}

export function parseDtsExports(source) {
  const names = new Set()
  for (const match of source.matchAll(/export\s*(?:type\s+)?\{([^}]*)\}/g)) {
    for (const part of match[1].split(',')) {
      const name = part.trim().replace(/^type\s+/, '')
      if (name) names.add(name.split(/\s+as\s+/).pop())
    }
  }
  const declaration =
    /export\s+(?:declare\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z0-9_$]+)/g
  for (const match of source.matchAll(declaration)) names.add(match[1])
  return [...names].sort((a, b) => a.localeCompare(b))
}

function walk(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else files.push(full)
  }
  return files
}

export function collectArtifacts(dist = DIST) {
  const entryPath = join(dist, ENTRY)
  if (!existsSync(entryPath))
    throw new Error(`Missing ${entryPath}. Build core before reading the contract.`)

  const exportNames = parseEsmExports(readFileSync(entryPath, 'utf8'))
  if (exportNames.length === 0)
    throw new Error(`${ENTRY} exports nothing. Refusing to capture a broken contract.`)

  const files = {}
  for (const full of walk(dist).sort((a, b) => a.localeCompare(b))) {
    const path = relative(dist, full)
    if (LICENSE_SIDECAR.test(path)) continue
    const bytes = readFileSync(full)
    files[path] = {
      bytes: statSync(full).size,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    }
  }

  const declarations = join(dist, 'weilasdk.d.ts')
  return {
    entry: ENTRY,
    exports: exportNames,
    dtsExports: existsSync(declarations) ? parseDtsExports(readFileSync(declarations, 'utf8')) : [],
    assets: Object.keys(files)
      .filter((path) => path.startsWith('assets/'))
      .map((path) => relative('assets', path))
      .sort(),
    files,
  }
}

export function compareContract(baseline, current) {
  const problems = []
  for (const path of Object.keys(baseline.files)) {
    if (!(path in current.files)) problems.push(`missing file ${path}`)
  }
  for (const name of baseline.exports) {
    if (!current.exports.includes(name)) problems.push(`missing export ${name}`)
  }
  for (const name of baseline.dtsExports) {
    if (!current.dtsExports.includes(name)) problems.push(`missing d.ts export ${name}`)
  }
  for (const asset of baseline.assets) {
    if (!current.assets.includes(asset)) problems.push(`missing asset ${asset}`)
  }
  return problems
}

function main() {
  const write = process.argv.includes('--write')
  if (write) {
    const current = collectArtifacts()
    mkdirSync(dirname(BASELINE), { recursive: true })
    writeFileSync(BASELINE, `${JSON.stringify(current, null, 2)}\n`)
    console.log(
      `Wrote ${relative(PACKAGE, BASELINE)} with ${current.exports.length} exports and ${Object.keys(current.files).length} files.`,
    )
    return
  }

  if (!existsSync(BASELINE))
    throw new Error(`Missing ${BASELINE}. Run with --write on a clean trunk build first.`)

  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'))
  const current = collectArtifacts()
  const problems = compareContract(baseline, current)
  console.log(
    `Checked ${current.exports.length} exports and ${Object.keys(current.files).length} files.`,
  )
  if (problems.length) {
    for (const problem of problems) console.error(problem)
    process.exitCode = 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
