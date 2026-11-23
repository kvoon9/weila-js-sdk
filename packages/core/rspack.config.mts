import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DefinePlugin, type Configuration } from '@rspack/core'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(ROOT, 'src')
const ENV_KEYS = ['APPID', 'APPKEY', 'WSS'] as const

interface Env {
  APPID?: string
  APPKEY?: string
  WSS?: string
}

function readEnv(): Env {
  const file = path.resolve(ROOT, '.env')
  const values = new Map<string, string>()

  if (!existsSync(file)) return {}

  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)

    if (match) values.set(match[1], match[2].replace(/^['"]|['"]$/g, ''))
  }

  return {
    APPID: values.get('APPID'),
    APPKEY: values.get('APPKEY'),
    WSS: values.get('WSS'),
  }
}

function buildId(): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim()
  } catch {
    return 'dev'
  }
}

const env = readEnv()

for (const key of ENV_KEYS) {
  if (env[key] === undefined)
    console.warn(
      `[rspack] ${key} is not set. Defining an empty string; pass appId and appKey at init.`,
    )
}

export default {
  mode: 'production',
  context: SRC,
  stats: { children: true, errorDetails: true },
  entry: {
    weilasdk: { import: './weilasdk.ts', library: { type: 'module' } },
    weilasdk_data: { import: './weilasdk_data.ts', library: { type: 'module' } },
    weilasdk_log: { import: './weilasdk_log.ts', library: { type: 'module' } },
    weilasdk_compile_cfg: { import: './weila_compile_config.ts', library: { type: 'module' } },
  },
  output: {
    path: path.resolve(ROOT, 'dist'),
    filename: '[name].mjs',
    module: true,
    globalObject: 'globalThis',
    publicPath: '/',
    assetModuleFilename: 'assets/[name][ext]',
  },
  resolve: {
    extensions: ['.ts', '...'],
    alias: {
      audio: path.resolve(SRC, 'audio'),
      db: path.resolve(SRC, 'database'),
      fsm: path.resolve(SRC, 'fsm'),
      log: path.resolve(SRC, 'log'),
      main: path.resolve(SRC, 'main'),
      proto: path.resolve(SRC, 'proto'),
    },
  },
  module: {
    rules: [
      {
        test: /\.worker\.ts$/,
        use: [
          {
            loader: 'worker-rspack-loader',
            options: { filename: '[name].ts', inline: 'no-fallback' },
          },
        ],
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: { syntax: 'typescript', decorators: true },
                target: 'esnext',
                transform: { legacyDecorator: true, decoratorMetadata: false },
              },
            },
          },
        ],
      },
      {
        test: /\.worklet\.js$/,
        include: SRC,
        type: 'javascript/esm',
        use: [{ loader: path.resolve(ROOT, 'worklet-inline-loader.cjs') }],
      },
      { test: /\.js$/, include: SRC, type: 'javascript/esm' },
      { test: /\.(wav|wasm)$/, type: 'asset/resource' },
    ],
  },
  plugins: [
    new DefinePlugin({
      'process.env.APPID': JSON.stringify(env.APPID ?? ''),
      'process.env.APPKEY': JSON.stringify(env.APPKEY ?? ''),
      'process.env.DEBUG': JSON.stringify(''),
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.WL_BUILD_ID': JSON.stringify(buildId()),
      'process.env.WSS': JSON.stringify(env.WSS ?? ''),
    }),
  ],
} satisfies Configuration
