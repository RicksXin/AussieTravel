import React, { useEffect, useMemo, useRef, useState } from 'react'
import Taro, { useDidShow, useDidHide } from '@tarojs/taro'
import { View, Text, Image, ScrollView, Input, Picker, Switch } from '@tarojs/components'
import { days as originalDays, issues } from '../../data'
import source from '../../../data/trip-notes.json'
import { localDay, nextEvent, eventInstant } from '../../logic'
import { readStored, store, openSource, navigateToPlace, exportCalendar } from '../../services'
import icons from '../../assets/icons'
import coast from '../../assets/coast.png'

const labels = { flight:'航班', transit:'交通', hotel:'住宿', food:'美食', spot:'探索', shop:'购物' }
const dayNames=['上海','墨尔本','墨尔本','大洋路','自由日','悉尼','Kiama','悉尼','返程']
const tabs=[['timeline','calendar','每日行程'],['route','route','旅途全览'],['packing','bag','行前清单'],['reminders','bell','提醒核对']]
const Icon=({name,className=''})=><Image className={`icon ${className}`} src={icons[name]||icons.spot} mode='aspectFit'/>
const Button=({children,className='',...props})=><View {...props} className={`ui-button ${className}`} ariaRole='button' tabIndex={0} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();props.onClick?.(event)}}}>{children}</View>
function Countdown({at,now}) { const diff=Math.max(0,+at-now),d=Math.floor(diff/86400000),h=Math.floor(diff/3600000)%24,m=Math.floor(diff/60000)%60;return <View className='countdown'>{d>0?<><Text>{d}</Text><Text className='unit'>天</Text><Text>{h}</Text><Text className='unit'>小时</Text></>:<><Text>{h}</Text><Text className='unit'>小时</Text><Text>{m}</Text><Text className='unit'>分钟</Text></>}</View> }

export default function Index() {
  const [tab,setTab]=useState('timeline')
  const [active,setActive]=useState(()=>{const i=originalDays.findIndex(d=>d.date===localDay(new Date(),d.zone));return i<0?1:i})
  const [filter,setFilter]=useState('all'),[query,setQuery]=useState('')
  const [done,setDone]=useState(()=>readStored('aussie-done',{}))
  const [packed,setPacked]=useState(()=>readStored('aussie-packed',{}))
  const [times,setTimes]=useState(()=>readStored('aussie-times',{}))
  const [now,setNow]=useState(Date.now()),[foreground,setForeground]=useState(true)
  const [reminders,setReminders]=useState(()=>readStored('aussie-reminders',false))
  const [modal,setModal]=useState(null)
  const [editTime,setEditTime]=useState('09:00')
  const sent=useRef(new Set())
  const days=useMemo(()=>originalDays.map(d=>({...d,events:d.events.map(e=>Object.prototype.hasOwnProperty.call(times,e.id)?{...e,time:times[e.id],edited:true}:e)})),[times])
  const day=days[active],upcoming=nextEvent(days,new Date(now),done)
  const completeCount=day.events.filter(e=>done[e.id]).length
  const selectedEvent=modal?.id?days.flatMap(d=>d.events).find(e=>e.id===modal.id):null
  const selectedDay=selectedEvent?days.find(d=>d.events.some(e=>e.id===selectedEvent.id)):day
  useDidShow(()=>{setForeground(true);setNow(Date.now())})
  useDidHide(()=>setForeground(false))
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(id)},[])
  useEffect(()=>{Taro.pageScrollTo({scrollTop:0,duration:0}).catch(()=>{})},[tab])
  useEffect(()=>{
    if(!reminders||!foreground)return
    const due=days.flatMap(d=>d.events.map(e=>({d,e,at:eventInstant(d,e)}))).find(({e,at})=>at&&!e.optional&&!done[e.id]&&!sent.current.has(e.id)&&+at>=now&&+at-now<=30*60000)
    if(due){sent.current.add(due.e.id);Taro.showModal({title:'接下来的安排',content:`${due.e.time} ${due.e.title}（${due.d.city}当地时间）`,showCancel:false,confirmColor:'#24594d'})}
  },[now,reminders,foreground,days,done])
  const toast=title=>Taro.showToast({title,icon:'none'})
  function chooseDay(i){setActive(i);setFilter('all');setQuery('');setTab('timeline')}
  function toggleDone(id){const next={...done,[id]:!done[id]};setDone(next);store('aussie-done',next)}
  function togglePacked(id){const next={...packed,[id]:!packed[id]};setPacked(next);store('aussie-packed',next)}
  function showEvent(e){setEditTime(e.time||'09:00');setModal({type:'event',id:e.id})}
  function saveTime(value){const next={...times,[selectedEvent.id]:value};setTimes(next);store('aussie-times',next);setModal(null);toast(value?'时间已保存，请同步已导入日历':'已改为待安排')}
  function resetTime(){const next={...times};delete next[selectedEvent.id];setTimes(next);store('aussie-times',next);setModal(null);toast('已恢复原计划时间')}
  function renderEvent(e){return <View key={e.id} className={`event ${done[e.id]?'completed':''}`}>
    <View className='event-time'><Text className='time-value'>{e.time||'待安排'}</Text><Text className='time-hint'>{e.optional?'备选':e.edited?'自定时间':e.time?'计划时间':'按顺序游览'}</Text></View>
    <View className={`timeline-dot ${e.type}`}><Icon name={e.type}/></View>
    <View className='event-card'>
      <View className='event-open' onClick={()=>showEvent(e)} ariaRole='button' ariaLabel={`查看${e.title}`}>
        <View className='event-tags'><Text className={`type ${e.type}`}>{labels[e.type]}</Text>{e.optional&&<Text className='optional'>可选行程</Text>}{done[e.id]&&<Text className='finished-label'>已完成</Text>}</View>
        <Text className='event-title'>{e.title}</Text><Text className='event-note'>{e.note}</Text>
      </View>
      <View className='event-actions'><Text className='event-place'>{e.place||'地点待确认'}</Text><View className='action-group'>
        {e.place&&<Button className='navigate' onClick={()=>navigateToPlace(e)} ariaLabel={`搜索地点：${e.place}`}><Icon name='pin'/>{process.env.TARO_ENV==='h5'?'导航':'地点'}</Button>}
        <Button className='complete-button' onClick={()=>toggleDone(e.id)} ariaLabel={`${done[e.id]?'撤销完成':'标记完成'}：${e.title}`}><Text>{done[e.id]?'✓':'○'}</Text></Button>
      </View></View>
    </View>
  </View>}
  function renderTimeline(){const filtered=day.events.filter(e=>(filter==='all'||e.type===filter)&&(e.title+e.note+e.place).toLowerCase().includes(query.toLowerCase()));const issue=issues.find(i=>i.date===day.date.slice(5).replace('-','.'));return <>
    <ScrollView scrollX className='day-scroll' enhanced showScrollbar={false} scrollIntoView={`day-${active}`} scrollWithAnimation><View className='day-strip'>{days.map((d,i)=><View key={d.date} id={`day-${i}`} onClick={()=>chooseDay(i)} className={`day ${i===active?'active':''}`} ariaRole='button' ariaLabel={`${d.date} ${d.city}`}><Text className='day-label'>{i===0?'出发日':`DAY ${String(i).padStart(2,'0')}`}</Text><Text className='day-date'>{d.date.slice(5).replace('-','.')}</Text><Text className='day-city'>{dayNames[i]}</Text><View className='day-dot'/></View>)}</View></ScrollView>
    <View className='content-grid'><View className='itinerary'>
      <View className='section-heading'><View><Text className='eyebrow'>{day.en}</Text><Text className='section-title'>{day.title}</Text><Text className='section-subtitle'>{day.subtitle}</Text></View><View className='date-circle'><Text>{day.date.slice(8)}</Text><Text className='month'>{day.date.slice(5,7)}月</Text></View></View>
      <View className='timeline-toolbar'><ScrollView scrollX className='filter-scroll' showScrollbar={false}><View className='filters'>{[['all','全部'],['spot','探索'],['food','美食'],['transit','交通'],['flight','航班'],['hotel','住宿'],['shop','购物']].map(([id,l])=><Button key={id} onClick={()=>setFilter(id)} className={filter===id?'chosen':''}>{l}</Button>)}</View></ScrollView><Button className='text-button original-button' onClick={()=>setModal({type:'notes'})}>原备注 ↗</Button></View>
      <View className='search-field'><Icon name='search'/><Input value={query} onInput={e=>setQuery(e.detail.value)} placeholder='搜索当天景点、餐厅、备注…' ariaLabel='搜索当天行程'/>{!!query&&<Button onClick={()=>setQuery('')} ariaLabel='清除搜索'>×</Button>}</View>
      <View className='events'>{filtered.length?filtered.map(renderEvent):<View className='empty'>没有匹配的安排，换个关键词试试。</View>}</View>
    </View><View className='right-column'>
      <View className='next-card'><Text className='eyebrow'>{now<+new Date('2026-09-25T00:00:00+08:00')?'✳ 旅程倒计时':'✳ 接下来的定时安排'}</Text>{upcoming?<><View className='next-content'><View><Countdown at={upcoming.at} now={now}/><Text className='next-caption'>后，{now<+new Date('2026-09-25T00:00:00+08:00')?'启程去澳洲':'下一项计划开始'}</Text></View><View className='next-info'><Text>{upcoming.day.date.slice(5).replace('-','.')} · {upcoming.event.time} 当地时间</Text><Text className='next-title'>{upcoming.event.title}</Text></View></View><Button className='button dark next-button' onClick={()=>chooseDay(upcoming.day.number)}>查看当天行程<Text>→</Text></Button></>:<Text className='next-title'>所有定时安排已结束，回看旅行足迹吧。</Text>}</View>
      <View className='mini-card progress-card'><View className='mini-title'><Text>今天，慢慢完成</Text><Text>{completeCount}/{day.events.length}</Text></View><View className='progress'><View className='progress-fill' style={{width:`${completeCount/day.events.length*100}%`}}/></View><Text className='muted'>已完成的足迹保存在当前设备。</Text></View>
      {issue&&<View className='note-card' onClick={()=>setTab('reminders')}><Text className='note-tag'>A LITTLE REMINDER</Text><Text className='note-title'>出发前，确认一下</Text><Text className='note-content'>{issue.text}</Text><Text className='note-link'>查看待核对事项 →</Text></View>}
      <Button className='notes-button' onClick={()=>setModal({type:'notes'})}><Icon name='bag'/><View><Text>点菜、交通与拍照攻略</Text><Text className='muted'>展开当天的完整原备注</Text></View><Text>→</Text></Button>
    </View></View>
  </>}
  function renderRoute(){return <><View className='view-heading'><Text className='eyebrow'>YOUR JOURNEY, AT A GLANCE</Text><Text className='section-title'>从城市，到海岸线</Text><Text className='muted'>9 天（含出发日）· 点开任意一天查看行程</Text></View><View className='route-overview'><View className='route-line'><Text>上海</Text><Text>✈</Text><Text>吉隆坡</Text><Text>✈</Text><Text>墨尔本</Text><Text>✈</Text><Text>悉尼</Text></View><Text className='muted'>路线示意 · 大洋路从墨尔本往返，Kiama 从悉尼往返</Text></View><View className='overview-grid'>{days.map((d,i)=><View key={d.date} className='overview-card' onClick={()=>chooseDay(i)} ariaRole='button'><View className='overview-top'><Text>{i===0?'DEPARTURE':`DAY ${i}`}</Text><Text>{d.date.slice(5).replace('-','.')}</Text></View><View className={`overview-icon ${i===3||i===6?'coast':''}`}><Icon name={i===0||i===5||i===8?'flight':i===3||i===6?'spot':'compass'}/></View><Text className='overview-title'>{d.city}</Text><Text className='overview-subtitle'>{d.title}</Text><View className='overview-bottom'><Text>{d.events.length} 项安排</Text><Text>→</Text></View></View>)}</View></>}
  function renderPacking(){return <><View className='view-heading'><Text className='eyebrow'>READY, SET, GO</Text><Text className='section-title'>打包一份好心情</Text><Text className='muted'>来自原表的 {source.packing.length} 项准备事项，勾选保存在当前设备。</Text></View><View className='packing-summary'><Text className='packed-number'>{source.packing.filter(p=>packed[p.id]).length}<Text className='unit'> / {source.packing.length} 已准备</Text></Text><Text className='muted'>原表对转接头有不同备注，装包前请核对充电器。</Text></View><View className='packing-groups'>{['行前准备','随身背包','行李箱'].map(group=><View key={group} className='packing-group'><View className='group-title'><Icon name='bag'/><Text>{group}</Text></View>{source.packing.filter(p=>p.group===group).map(p=><View key={p.id} className={`check-row ${packed[p.id]?'checked':''}`} onClick={()=>togglePacked(p.id)} ariaRole='checkbox' ariaChecked={!!packed[p.id]}><View className='check-box'>{packed[p.id]?'✓':''}</View><Text>{p.label}</Text></View>)}</View>)}</View></>}
  function renderReminders(){return <><View className='view-heading'><Text className='eyebrow'>A LITTLE PEACE OF MIND</Text><Text className='section-title'>让提醒，替你记着</Text><Text className='muted'>有明确时间的安排提前提醒；未定与可选项目不自动加入日历。</Text></View><View className='reminder-options'><View className='mini-card'><View className='feature-icon'><Icon name='calendar'/></View><Text className='feature-title'>手机日历提醒</Text><Text className='feature-description'>导出 .ics 后导入手机日历，提前 30 分钟提醒。请确认日历通知开启；更改行程后同步更新日历，避免重复导入。</Text><Button className='button dark' onClick={()=>exportCalendar(days)}><Icon name='download'/>{process.env.TARO_ENV==='h5'?'下载日历文件':'分享日历文件'}</Button></View><View className='mini-card'><View className='feature-icon peach'><Icon name='bell'/></View><View className='switch-row'><Text className='feature-title'>应用内提醒</Text><Switch checked={reminders} color='#24594d' onChange={e=>{setReminders(e.detail.value);store('aussie-reminders',e.detail.value)}}/></View><Text className='feature-description'>仅在页面打开期间提示即将开始的事项。离开小程序或锁屏后，请依靠日历通知。</Text><View className='subscription-note'><Text>微信订阅消息 · 尚未接入</Text><Text className='muted'>暂未开通，可先使用手机日历接收离线提醒。</Text></View></View></View><Text className='issues-title'>原计划里，有 {issues.length} 处需要留意</Text><View className='issues'>{issues.map(i=><View className='issue' key={i.title}><Text className='issue-date'>{i.date}</Text><View className='issue-body'><Text className='issue-title'>{i.title}</Text><Text className='issue-text'>{i.text}</Text></View></View>)}</View><Text className='source-disclaimer'>2026.09.16 飞书快照 · 不会自动同步原表修改。时间、票价、营业信息和取消条款未重新核实；原表浮动图片未导入。</Text><Button className='text-button' onClick={()=>openSource(null,'wqGvS6')}>复制飞书原计划链接 ↗</Button></>}
  const noteRows=day.range?source.rows.filter(r=>r.row>=day.range[0]&&r.row<=day.range[1]):[]
  return <View className='app-shell'>
    <View className='main'><View className='topbar'><View><Text className='top-muted'>我的旅行</Text><Text className='top-divider'> / </Text><Text>澳大利亚</Text></View><View className='top-actions'><Button className='icon-button' ariaLabel='查看提醒' onClick={()=>setTab('reminders')}><Icon name='bell'/></Button><Text className='avatar'>AU</Text></View></View><View className='page'>
      {tab==='timeline'&&<><View className='page-heading'><View><Text className='eyebrow'>LET’S MAKE SOME MEMORIES</Text><Text className='page-title'>澳洲，一路慢游 <Text className='asterisk'>✳</Text></Text><Text className='page-subtitle'>把计划装进口袋，把时间留给风景。</Text></View><Button className='button export-button' onClick={()=>exportCalendar(days)}><Icon name='download'/>日历</Button></View>
      <View className='hero'><Image src={coast} className='scenery' mode='aspectFill'/><View className='hero-wash'/><View className='hero-content'><Text className='hero-tag'>✧ AUSTRALIA · SPRING 2026</Text><Text className='hero-title'>下一站，{`\n`}南半球的春天。</Text><Text className='hero-description'>墨尔本的咖啡香，悉尼的海风。{`\n`}这一次，跟着自己的节奏走。</Text><View className='hero-meta'><Text>▦ 9.25 — 10.03</Text><Text>⌁ 2 座城市 · 2 条海岸线</Text></View></View><View className='hero-stamp'><Text>A LITTLE</Text><Text>AUSTRALIAN</Text><Text>ADVENTURE</Text></View></View>
      </>}
      {tab==='timeline'?renderTimeline():tab==='route'?renderRoute():tab==='packing'?renderPacking():renderReminders()}
      <View className='footer'><Text>MADE FOR YOUR LITTLE ADVENTURE</Text><Text>来自飞书计划 · 旅行当地时间 · 本地保存</Text></View>
    </View></View>
    <View className='bottom-nav'>{tabs.map(([id,i,l])=><Button key={id} className={`bottom-tab ${tab===id?'selected':''}`} onClick={()=>setTab(id)}><Icon name={i}/><Text>{l}</Text>{tab===id&&<View className='active-indicator'/>}</Button>)}</View>
    {modal&&<View className='modal-mask' onClick={()=>setModal(null)}><View className='modal-panel' onClick={e=>e.stopPropagation()}><Button className='close-modal' ariaLabel='关闭详情' onClick={()=>setModal(null)}>×</Button><ScrollView scrollY className='modal-scroll'><View className='modal-content'>
      {modal.type==='notes'?<><Text className='eyebrow'>THE ORIGINAL NOTES</Text><Text className='modal-title'>{day.date.slice(5).replace('-','.')} · 原计划随身看</Text><Text className='modal-intro'>餐厅备选、点菜、交通与拍照攻略完整保留。原表内容可能包含备选方案，时间与价格未重新核实。</Text>{noteRows.length?noteRows.map(r=><View className='original-note' key={r.row}><Text className='row-number'>原表第 {r.row} 行</Text><Text className='original-title'>{r.cells.slice(0,3).filter(Boolean).join(' · ')||'补充备注'}</Text><Text className='original-text'>{r.cells.slice(3,5).filter(Boolean).join('\n')}</Text></View>):<Text className='modal-intro'>详细表中没有当天安排，请核对汇总表及航班确认单。</Text>}<Button className='text-button' onClick={()=>openSource(null,day.range?'BWm0nP':'wqGvS6')}>复制飞书原表链接 ↗</Button></>:<><Text className='eyebrow'>{selectedDay.date} · {selectedDay.city}当地时间</Text><Text className='modal-title'>{selectedEvent.title}</Text><Text className={`type ${selectedEvent.type}`}>{labels[selectedEvent.type]}</Text><Text className='modal-intro'>{selectedEvent.note}</Text>{selectedEvent.place&&<Button className='button' onClick={()=>navigateToPlace(selectedEvent)}><Icon name='pin'/>搜索地点</Button>}<View className='edit-time'><Text className='feature-title'>安排时间</Text><Text className='muted'>使用所在地时间。更改保存在此设备；若已导入日历，请同步调整。{selectedEvent.optional?'此项为可选，不加入自动提醒。':''}</Text><Picker mode='time' value={editTime} onChange={e=>setEditTime(e.detail.value)}><View className='time-picker'>当地时间<Text>{editTime} ▾</Text></View></Picker><Button className='button dark' onClick={()=>saveTime(editTime)}>保存时间</Button><Button className='text-button clear-time' onClick={()=>saveTime(null)}>改为待安排</Button>{selectedEvent.edited&&<Button className='text-button reset-time' onClick={resetTime}>恢复原计划时间</Button>}</View><Button className='text-button' onClick={()=>openSource(selectedEvent.row,selectedEvent.sourceSheet)}>复制此项飞书链接 ↗</Button></>}
    </View></ScrollView></View></View>}
  </View>
}
