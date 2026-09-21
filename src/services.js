import Taro from '@tarojs/taro'
import { ics } from './logic'
export const sourceUrl = (row, sheet = 'BWm0nP') => `https://my.feishu.cn/sheets/HhDQsvfazhGkR3tTbnucfA78nUf?sheet=${sheet}${row ? `&range=A${row}:E${row}` : ''}`
export function readStored(key, fallback) { try { return Taro.getStorageSync(key) || fallback } catch { return fallback } }
export function store(key, value) { try { Taro.setStorageSync(key, value) } catch { Taro.showToast({ title: '存储失败，更改未保存', icon: 'none' }) } }
export function copyText(text) { return Taro.setClipboardData({ data: text }).catch(() => Taro.showToast({ title: '复制失败，请重试', icon: 'none' })) }
export function openSource(row, sheet) { return copyText(sourceUrl(row, sheet)) }
export async function navigateToPlace(event) {
  if (!event.place) return
  if (process.env.TARO_ENV === 'h5') {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.place)}`, '_blank', 'noopener,noreferrer')
    return
  }
  // No guessed coordinates: the original sheet only gives place names.
  await copyText(event.place)
  await Taro.showModal({ title: '地点已复制', content: '打开微信地图或你常用的地图 App，粘贴英文地点搜索并核对门店。原计划没有提供精确坐标。', showCancel: false, confirmColor: '#24594d' })
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
