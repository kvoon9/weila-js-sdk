const path = require('path')
const DotEnv = require('dotenv-webpack')

module.exports = (env) => {
  return {
    mode: process.env.NODE_ENV,
    context: path.resolve(__dirname, 'src'),
    experiments: {
      outputModule: true,
    },
    mode: process.env.NODE_ENV,
    context: path.resolve(__dirname, 'src'),
    devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
    stats: {
      children: true,
      errorDetails: true,
    },
    entry: {
      weilasdk: {
        import: './weilasdk.ts',
        library: {
          type: 'module',
        },
      },
      weilasdk_data: {
        import: './weilasdk_data.ts',
        library: {
          type: 'module',
        },
      },
      weilasdk_log: {
        import: './weilasdk_log.ts',
        library: {
          type: 'module',
        },
      },
      weilasdk_compile_cfg: {
        import: './weila_compile_config.ts',
        library: {
          type: 'module',
        },
      },
    },
    output: {
      path:
        process.env.NODE_ENV === 'production'
          ? path.resolve(__dirname, 'dist')
          : path.resolve(__dirname, '../../project_dir/weila_webapp/node_modules/weilasdk/dist'),
      // path: env.production ? path.resolve(__dirname, 'dist') : path.resolve(__dirname, '../../project_dir/test_new_pro/node_modules/weilasdk/dist'),
      // path: env.production ? path.resolve(__dirname, 'dist') :
      //     env.webweila ? path.resolve(__dirname, '../weila_webapp/node_modules/weilasdk/dist') :
      //         path.resolve(__dirname, '../wl_dashboard/node_modules/weilasdk/dist'),
      // path: path.resolve(__dirname, '../wlsdk_test/node_modules/wl_js_new_sdk/dist'),
      //path: path.resolve(__dirname, 'dist'),
      globalObject: 'globalThis',
      publicPath: '/',
      assetModuleFilename: 'assets/[name][ext]',
    },
    resolve: {
      extensions: ['.ts', '...'],
      // 需要配合tsconfig.json一起，否则这个用在typescript不管用
      alias: {
        fsm: path.resolve(__dirname, 'src/fsm'),
        main: path.resolve(__dirname, 'src/main'),
        log: path.resolve(__dirname, 'src/log'),
        db: path.resolve(__dirname, 'src/database'),
        proto: path.resolve(__dirname, 'src/proto'),
        audio: path.resolve(__dirname, 'src/audio'),
      },
    },
    module: {
      rules: [
        {
          test: /\.worker\.ts$/,
          use: [
            {
              loader: 'worker-loader',
              options: {
                filename: '[name].ts',
                inline: 'no-fallback',
              },
            },
          ],
        },
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                compilerOptions: {
                  baseUrl: path.resolve(__dirname, 'src'),
                  // outDir: path.resolve(__dirname, '../wlsdk_test/node_modules/wl_js_new_sdk/dist')
                  //outDir: path.resolve(__dirname, 'dist'),
                  outDir:
                    process.env.NODE_ENV === 'production'
                      ? path.resolve(__dirname, 'dist')
                      : path.resolve(
                          __dirname,
                          '../../project_dir/weila_webapp/node_modules/weilasdk/dist',
                        ),
                  //outDir: env.production ? path.resolve(__dirname, 'dist') : path.resolve(__dirname, '../../project_dir/test_new_pro/node_modules/wl_js_new_sdk/dist')
                  // outDir: env.production ? path.resolve(__dirname, 'dist') :
                  //     env.webweila ? path.resolve(__dirname, '../weila_webapp/node_modules/weilasdk/dist') :
                  //         path.resolve(__dirname, '../wl_dashboard/node_modules/weilasdk/dist')
                },
              },
            },
          ],
          exclude: /node_modules/,
        },
        {
          test: /\.worklet\.js$/,
          use: {
            loader: 'worklet-loader',
            options: {
              name: '[name].js',
              inline: true,
            },
          },
        },
        {
          test: /\.(wav|wasm)$/,
          type: 'asset/resource',
        },
      ],
    },

    plugins: [
      new DotEnv({
        expand: true,
      }),
    ],
  }
}
