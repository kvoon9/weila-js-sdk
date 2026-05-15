import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

const sourceCssPath = resolve(rootDir, 'src/style.postcss.css')
const distCssPath = resolve(rootDir, 'dist/index.css')
const floatingVueCssPath = resolve(rootDir, 'node_modules/floating-vue/dist/style.css')

function unwrapCascadeLayers() {
  return {
    postcssPlugin: 'unwrap-cascade-layers',
    AtRule: {
      layer(atRule) {
        if (atRule.nodes?.length) {
          atRule.replaceWith(...atRule.nodes)
        }
        else {
          atRule.remove()
        }
      },
    },
  }
}
unwrapCascadeLayers.postcss = true

const [sourceCss, componentCss, floatingVueCss] = await Promise.all([
  readFile(sourceCssPath, 'utf8'),
  readFile(distCssPath, 'utf8').catch(() => ''),
  readFile(floatingVueCssPath, 'utf8'),
])

const tailwindCss = await postcss([
  tailwindcss(),
  autoprefixer(),
  unwrapCascadeLayers(),
]).process(sourceCss, {
  from: sourceCssPath,
  to: distCssPath,
})

await writeFile(
  distCssPath,
  [
    tailwindCss.css,
    componentCss,
    floatingVueCss,
  ].filter(Boolean).join('\n'),
)
