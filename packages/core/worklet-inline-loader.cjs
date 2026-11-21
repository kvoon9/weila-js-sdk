const fs = require('node:fs')
const path = require('node:path')

module.exports = function workletInlineLoader() {
  const name = `${path.basename(this.resourcePath, '.js')}.iife.js`
  const file = path.resolve(__dirname, 'dist/worklets', name)
  const source = fs.readFileSync(file, 'utf8')
  this.cacheable(true)

  return [
    `const source = ${JSON.stringify(source)}`,
    "export default URL.createObjectURL(new Blob([source], { type: 'application/javascript' }))",
    '',
  ].join('\n')
}
