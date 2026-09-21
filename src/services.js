import Taro from '@tarojs/taro'
import { ics } from './logic'
import { locationFor, googleMapsUrl } from './places'
export const sourceUrl = (row, sheet = 'BWm0nP') => `https://my.feishu.cn/sheets/HhDQsvfazhGkR3tTbnucfA78nUf?sheet=${sheet}${row ? `&range=A${row}:E${row}` : ''}`
export function readStored(key, fallback) { try { return Taro.getStorageSync(key) || fallback } catch { return fallback } }
export function store(key, value) { try { Taro.setStorageSync(key, value) } catch { Taro.showToast({ title: '存储失败，更改未保存', icon: 'none' }) } }
export function copyText(text) { return Taro.setClipboardData({ data: text }).catch(() => Taro.showToast({ title: '复制失败，请重试', icon: 'none' })) }
export function openSource(row, sheet) { return copyText(sourceUrl(row, sheet)) }
export async function copyGoogleMapsLink(event) {
  try {
    await Taro.setClipboardData({ data: googleMapsUrl(event) })
    await Taro.showModal({ title: 'Google Maps 链接已复制', content: '在 Safari 或 Chrome 的地址栏粘贴打开，可查看路线或进入 Google Maps。', showCancel: false, confirmColor: '#24594d' })
  } catch {
    Taro.showToast({ title: '复制未完成，请重试', icon: 'none' })
  }
}
export async function navigateToPlace(event) {
  if (!event.place) return
  if (process.env.TARO_ENV === 'h5') {
    window.open(googleMapsUrl(event), '_blank', 'noopener,noreferrer')
    return
  }
  const point = locationFor(event)
  if (point) {
    try {
      await Taro.openLocation({ latitude: point.latitude, longitude: point.longitude, name: event.place, address: point.name, scale: 16 })
      return
    } catch (error) {
      if (/cancel/i.test(error?.errMsg || error?.message || '')) return
      const result = await Taro.showModal({ title: '地图暂时无法打开', content: '可以复制 Google Maps 路线链接，在手机浏览器中打开。', confirmText: '复制链接', confirmColor: '#24594d' })
      if (result.confirm) await copyGoogleMapsLink(event)
      return
    }
  }
  try {
    const result = await Taro.showActionSheet({ itemList: ['复制地点名称', '复制 Google Maps 路线链接'] })
    if (result.tapIndex === 1) await copyGoogleMapsLink(event)
    else await copyText(event.place)
  } catch { /* Dismissing the menu does not change the itinerary. */ }
}
export async function exportCalendar(days) {
  const calendar=ics(days)
  try {
    if (process.env.TARO_ENV === 'h5') {
      const url=URL.createObjectURL(new Blob([calendar],{type:'text/calendar;charset=utf-8'}))
      const a=document.createElement('a');a.href=url;a.download='aussie-travel-2026.ics';a.click()
      setTimeout(()=>URL.revokeObjectURL(url),1000)
      Taro.showToast({ title:'下载后导入手机日历',icon:'none' })
    } else {
      const filePath=`${Taro.env.USER_DATA_PATH}/aussie-travel-2026.ics`
      const manager=Taro.getFileSystemManager()
      await new Promise((resolve,reject)=>manager.writeFile({filePath,data:calendar,encoding:'utf8',success:resolve,fail:reject}))
      await Taro.shareFileMessage({ filePath,fileName:'aussie-travel-2026.ics' })
    }
  } catch (error) {
    if (String(error.errMsg||error.message).includes('cancel')) return
    Taro.showModal({ title:'日历文件暂时无法分享',content:'可以使用 H5 预览版下载 .ics 文件，再导入手机日历。微信开发者工具不一定支持文件分享，请在真机测试。',showCancel:false,confirmColor:'#24594d' })
  }
}

// Native API measurements are physical px; keep them as strings to avoid rpx scaling.
export function headerLayout() {
  if (process.env.TARO_ENV !== 'weapp') return { statusTop: 'env(safe-area-inset-top, 0px)', navHeight: '44px', rightInset: '20px' }
  let statusTop = 20, navHeight = 44, rightInset = 110
  try {
    const info = Taro.getWindowInfo()
    statusTop = info.statusBarHeight ?? statusTop
    const capsule = Taro.getMenuButtonBoundingClientRect()
    if (capsule.height > 0 && capsule.top >= statusTop && capsule.left > 0) {
      navHeight = capsule.height + (capsule.top - statusTop) * 2
      rightInset = info.windowWidth - capsule.left + 12
    }
  } catch { /* Keep a safe navigation area if the native measurement is unavailable. */ }
  return { statusTop: `${statusTop}px`, navHeight: `${navHeight}px`, rightInset: `${rightInset}px` }
}
