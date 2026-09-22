import fs from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

// Uploads the guide photos to WeChat cloud storage and verifies each one is really readable.
// Credentials come from `npx tcb login` in ~/.config: never put the AppSecret or a Tencent
// Cloud key in this repo. The mini-program resolves these files at runtime through
// wx.cloud.getTempFileURL, because this environment's plan forbids public-read storage.
const MANIFEST = 'data/media-manifest.json'
const LOCAL_DIR = 'src/guide-media/h5'
const run = promisify(execFile)
const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8'))
const cloudDir = manifest.cloudPath.replace(/^\/+|\/+$/g, '')
const names = Object.keys(manifest.files)
const dryRun = process.argv.includes('--dry-run')
const tcb = (...args) => run('npx', ['tcb', ...args, '-e', manifest.env], { maxBuffer: 8 << 20 })
const fail = message => { console.error(`\n✖ ${message}`); process.exit(1) }

const mb = (Object.values(manifest.files).reduce((n, f) => n + f.bytes, 0) / 1048576).toFixed(1)
console.log(`环境 ${manifest.env} · ${names.length} 张图 · ${mb} MB · ${LOCAL_DIR} → ${cloudDir}/`)

try { await tcb('env', 'list') } catch { fail('未登录。请先执行：npx tcb login（浏览器扫码授权）') }

if (dryRun) { console.log('已登录。--dry-run：未上传、未改动 manifest。'); process.exit(0) }

console.log('\n上传中…')
try { await tcb('storage', 'upload', LOCAL_DIR, cloudDir, '--times', '3') }
catch (error) { fail(`上传失败：${error.stderr || error.message}`) }

// Compare the cloud listing with the manifest: a silent partial upload would otherwise
// only surface on the device, as photos missing from some detail panels.
let listed = ''
try { listed = (await tcb('storage', 'list', cloudDir)).stdout } catch (error) { fail(`无法列出云端文件：${error.stderr || error.message}`) }
const remote = new Set([...listed.matchAll(/([\w.-]+\.jpg)/g)].map(m => m[1]))
const missing = names.filter(name => !remote.has(name))
if (missing.length) fail(`${missing.length} 个文件未出现在云端，manifest 未改动：\n  ${missing.join('\n  ')}`)
console.log(`云端已列出全部 ${names.length} 个文件`)

// A signed URL is what the mini-program will actually receive, so fetch a sample to prove
// the files are readable rather than just present. Its host also carries the bucket name,
// which src/media.js needs to build cloud://<env>.<bucket>/<path> file IDs.
console.log('\n抽样校验签名链接可读…')
const sample = [names[0], names[Math.floor(names.length / 2)], names[names.length - 1]]
let bucket = ''
for (const name of sample) {
  let url = ''
  try {
    const { stdout } = await tcb('storage', 'url', `${cloudDir}/${name}`, '--json')
    url = (stdout.match(/https?:\/\/[^\s"']+/) || [''])[0]
    if (!url) throw new Error(stdout.trim().slice(0, 200))
  } catch (error) { fail(`${name} 无法取得访问地址：${error.stderr || error.message}`) }
  const host = new URL(url).host
  const found = host.replace(/\.tcb\.qcloud\.la$/, '')
  if (bucket && found !== bucket) fail(`${name} 的存储桶 ${found} 与 ${bucket} 不一致`)
  bucket = found
  const res = await fetch(url, { headers: { Range: 'bytes=0-0' } }).catch(error => ({ status: 0, error }))
  const type = res.headers?.get?.('content-type') || ''
  if (res.status !== 200 && res.status !== 206) fail(`${name} → HTTP ${res.status || res.error?.message}`)
  if (!type.startsWith('image/')) fail(`${name} → content-type ${type || '缺失'}`)
  console.log(`  ✔ ${name}`)
}
if (!bucket.includes(manifest.env)) fail(`存储桶 ${bucket} 看起来不属于环境 ${manifest.env}`)
if (manifest.bucket && manifest.bucket !== bucket) console.log(`存储桶已更新：${manifest.bucket} → ${bucket}`)
manifest.bucket = bucket
console.log(`存储桶：${bucket}`)

manifest.uploadedAt = new Date().toISOString().slice(0, 10)
await fs.writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`\n✔ ${names.length} 个文件已在云存储，已写入 ${MANIFEST}`)
console.log('下一步：npm run build:weapp，然后在微信开发者工具真机预览确认图片显示。')
