// Update the existing WeChat stylesheet without starting the full compiler.
const fs = require('fs')
const path = require('path')
const postcss = require('postcss')
const pxtransform = require('postcss-pxtransform')
const config = require('../config')

async function main() {
  const root = path.resolve(__dirname, '..')
  const source = path.join(root, 'src/readability.css')
  const output = path.join(root, 'dist/weapp/app.wxss')
  if (!fs.existsSync(output)) throw new Error('Run build:weapp first; no existing app.wxss found.')
  const result = await postcss([pxtransform({
    platform: 'weapp', designWidth: config.designWidth, deviceRatio: config.deviceRatio
  })]).process(fs.readFileSync(source, 'utf8'), { from: source, to: output })
  const marker = '/* aussie-readability-overrides */'
  const existing = fs.readFileSync(output, 'utf8').split(marker)[0]
  fs.writeFileSync(output, existing + '\n' + marker + '\n' + result.css)
  const rules = postcss.parse(result.css)
  const sizes = {}
  rules.walkRules(rule => {
    if (['.event-note', '.original-text', '.bottom-tab'].includes(rule.selector)) {
      rule.walkDecls('font-size', decl => { sizes[rule.selector] = decl.value })
    }
  })
  if (sizes['.event-note'] !== '26.92308rpx') throw new Error('Unexpected mobile font scaling')
  console.log('WeChat readability stylesheet updated:', sizes)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
