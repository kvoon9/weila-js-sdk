import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import vm from 'node:vm'
import type { Browser, Page } from '@playwright/test'
import { chromium, expect, test } from '@playwright/test'
import { startServer } from './server.mjs'

interface ContractBaseline {
  exports: string[]
  assets: string[]
}

const PACKAGE = process.cwd()

const baseline: ContractBaseline = JSON.parse(
  readFileSync(join(PACKAGE, 'artifacts/contract-baseline.json'), 'utf8'),
)

let server: Awaited<ReturnType<typeof startServer>>
let browser: Browser
let page: Page
const consoleErrors: string[] = []

test.beforeAll(async () => {
  server = await startServer()
  browser = await chromium.launch()
  page = await browser.newPage()
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))
  await page.goto(server.url)
  await page.waitForFunction(() => window.__ready === true)
})

test.afterAll(async () => {
  await browser?.close()
  await server?.close()
})

test('exports match the contract baseline', async () => {
  const names = await page.evaluate(() => Object.keys(window.__sdk).toSorted())
  expect(names).toEqual(baseline.exports)
})

test('wasm and wav assets are served with a body', async () => {
  for (const asset of baseline.assets) {
    const result = await page.evaluate(async (path) => {
      const response = await fetch(`/dist/assets/${path}`)

      return { status: response.status, bytes: (await response.arrayBuffer()).byteLength }
    }, asset)

    expect(result.status, asset).toBe(200)
    expect(result.bytes, asset).toBeGreaterThan(0)
  }
})

test('WeilaCore constructs in the browser', async () => {
  const result = await page.evaluate(() => {
    try {
      new window.__sdk.WeilaCore()

      return 'ok'
    } catch (error) {
      return String(error)
    }
  })

  expect(result).toBe('ok')
})

test('worklet bundles register their processors', () => {
  const registered: string[] = []

  const sandbox = {
    AudioWorkletProcessor: class {},
    Blob,
    console,
    currentTime: 0,
    registerProcessor: (name: string) => registered.push(name),
    sampleRate: 48000,
    URL,
  }

  for (const file of ['weila_player.worklet.iife.js', 'weila_recorder.worklet.iife.js'])
    vm.runInNewContext(readFileSync(join(PACKAGE, 'dist/worklets', file), 'utf8'), sandbox)
  expect(registered).toEqual(['weila_player_processor', 'weila_recorder_processor'])
})

test('the page records no console errors', () => {
  expect(consoleErrors).toEqual([])
})
