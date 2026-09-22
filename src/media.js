import Taro from '@tarojs/taro'
import manifest from '../data/media-manifest.json'

// Guide photos live in WeChat cloud storage: the mini-program main package must stay under 2 MB.
// H5 keeps the copied folder, which has no size budget.
//
// The environment's plan does not allow public-read storage, so unsigned URLs return 403 and no
// permanent address can be recorded. The mini-program resolves cloud file IDs through
// wx.cloud.getTempFileURL for display, then keeps its own copy via wx.cloud.downloadFile — a cloud
// API, so no downloadFile domain whitelist is needed. Saved copies outlive the signed URL, so
// previously viewed photos still open where roaming or venue signal drops out.
const PREFIX = '/guide-media/'
const CACHE_KEY = 'aussie-media-cache'
const BATCH = 50 // getTempFileURL accepts at most 50 file IDs per call; there are 45 photos.
const weapp = process.env.TARO_ENV === 'weapp'
const cloudDir = String(manifest.cloudPath || '').replace(/^\/+|\/+$/g, '')
const listeners = new Set()
const saving = new Map() // name → in-flight save, so a preview can await one already running
let cache = {}
let temp = {}
let resolving = null
let ready = false
let failure = ''

const cloud = () => (typeof wx !== 'undefined' && wx.cloud) || null
export const isGuideMedia = src => typeof src === 'string' && src.startsWith(PREFIX)
// File IDs must carry both the environment and the bucket: cloud://<env>.<bucket>/<path>.
const fileId = name => `cloud://${manifest.env}.${manifest.bucket}/${cloudDir}/${name}`
export const mediaFailure = () => failure

// Height as a percentage of width, for reserving a placeholder box of the right shape while a
// photo is still downloading. Falls back to 4:3 for anything not in the manifest.
export function mediaRatio(src) {
  const file = isGuideMedia(src) ? manifest.files[src.slice(PREFIX.length)] : null
  return file?.width && file?.height ? (file.height / file.width) * 100 : 75
}

function persist() {
  try { Taro.setStorageSync(CACHE_KEY, cache) } catch { /* The cache is an optimisation, not itinerary state. */ }
}

function notify() {
  for (const listener of listeners) listener()
}

// Keeps the reason visible: a silent failure here looks like a photo that never loads.
function report(stage, error) {
  failure = `${stage}：${error?.errMsg || error?.message || error}`
  console.error(`[media] ${failure}`)
  notify()
}

// Called from App's onLaunch. Safe to call more than once.
export function initCloud() {
  if (!weapp || ready) return
  ready = true
  try { cache = Taro.getStorageSync(CACHE_KEY) || {} } catch { cache = {} }
  const fs = Taro.getFileSystemManager()
  let dropped = false
  for (const [name, path] of Object.entries(cache)) {
    // WeChat may evict saved files when the local quota fills; forget those so they download again.
    try { fs.accessSync(path) } catch { delete cache[name]; dropped = true }
  }
  if (dropped) persist()
  const api = cloud()
  if (!api) return report('云开发不可用', '当前运行环境没有 wx.cloud，请确认小程序已开通云开发')
  try { api.init({ env: manifest.env, traceUser: false }) } catch (error) { report('云开发初始化失败', error) }
}

// Resolves every photo in one call, so opening any detail panel warms the whole set.
function resolveAll() {
  const api = cloud()
  if (!api || resolving) return resolving
  const names = Object.keys(manifest.files).slice(0, BATCH)
  resolving = api.getTempFileURL({ fileList: names.map(fileId) })
    .then(res => {
      const bad = []
      for (const item of res.fileList || []) {
        const name = String(item.fileID || '').split('/').pop()
        if (item.tempFileURL) temp[name] = item.tempFileURL
        else bad.push(`${name}(${item.errMsg || item.status || '无链接'})`)
      }
      if (bad.length) report('部分图片无法解析', bad.slice(0, 3).join('、'))
      else failure = ''
      notify()
    })
    .catch(error => { resolving = null; report('获取图片链接失败', error) })
  return resolving
}

// Returns the best source known right now: a saved local file, else a signed URL, else nothing.
export function mediaSrc(src) {
  if (!isGuideMedia(src) || !weapp) return src
  const name = src.slice(PREFIX.length)
  return cache[name] || temp[name] || ''
}

// Downloads one photo through the cloud API and keeps it. Resolves to the saved path, or '' on
// failure; the signed URL still displays the photo inline while online.
function saveMedia(name) {
  if (cache[name]) return Promise.resolve(cache[name])
  if (saving.has(name)) return saving.get(name)
  const api = cloud()
  if (!api) return Promise.resolve('')
  const job = api.downloadFile({ fileID: fileId(name) })
    .then(res => {
      if (!res.tempFilePath) throw new Error(res.errMsg || '下载未返回文件')
      return new Promise((resolve, reject) => Taro.getFileSystemManager().saveFile({ tempFilePath: res.tempFilePath, success: resolve, fail: reject }))
    })
    .then(saved => {
      cache[name] = saved.savedFilePath
      persist()
      notify()
      return saved.savedFilePath
    })
    .catch(() => '')
    .then(path => { saving.delete(name); return path })
  saving.set(name, job)
  return job
}

// Keeps a copy for offline use. Uses the cloud API so no download domain has to be whitelisted.
export function cacheMedia(src) {
  if (!weapp || !isGuideMedia(src)) return
  initCloud()
  const name = src.slice(PREFIX.length)
  if (cache[name] || saving.has(name)) return
  if (!temp[name]) { resolveAll(); return }
  saveMedia(name)
}

// previewImage downloads the URLs itself and honours the downloadFile domain whitelist, which the
// cloud API deliberately avoids — a signed cloud URL there shows a black screen with a spinner.
// So save the group first and hand previewImage local paths only.
export async function previewSrcList(photos) {
  if (!weapp) return photos.map(photo => photo.src)
  initCloud()
  const cloudPhotos = photos.filter(photo => isGuideMedia(photo.src))
  if (cloudPhotos.some(photo => !temp[photo.src.slice(PREFIX.length)])) await resolveAll()
  await Promise.all(cloudPhotos.map(photo => saveMedia(photo.src.slice(PREFIX.length))))
  // Bundled pose illustrations are already local, so they pass through untouched.
  return photos.map(photo => (isGuideMedia(photo.src) ? cache[photo.src.slice(PREFIX.length)] : photo.src)).filter(Boolean)
}

export function subscribeMedia(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
