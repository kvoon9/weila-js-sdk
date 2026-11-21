const path = require('node:path')

const ROOT = __dirname
const SRC = path.resolve(ROOT, 'src')

module.exports = {
  mode: 'production',
  context: path.resolve(SRC, 'audio'),
  entry: {
    'weila_player.worklet.iife': './weila_player.worklet.js',
    'weila_recorder.worklet.iife': './weila_recorder.worklet.js',
  },
  output: {
    path: path.resolve(ROOT, 'dist/worklets'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
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
      { test: /\.js$/, include: SRC, type: 'javascript/esm' },
    ],
  },
}
