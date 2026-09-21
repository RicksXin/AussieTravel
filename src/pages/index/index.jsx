import React, { useEffect, useMemo, useRef, useState } from 'react'
import Taro, { useDidShow, useDidHide } from '@tarojs/taro'
import { View, Text, Image, ScrollView, Input, Switch } from '@tarojs/components'
import { days as originalDays, issues } from '../../data'
import source from '../../../data/trip-notes.json'
import { localDay, nextEvent, eventInstant } from '../../logic'
import { readStored, store, openSource, navigateToPlace, exportCalendar, headerLayout } from '../../services'
import { locationLabel } from '../../places'
import { restaurantFor } from '../../restaurant-dishes'
import { spotGuideFor, poses } from '../../spot-guides'
import icons from '../../assets/icons'
import coast from '../../assets/coast.png'

const labels = { flight:'航班', transit:'交通', hotel:'住宿', food:'美食', spot:'探索', shop:'购物' }
const dayNames=['上海','墨尔本','墨尔本','大洋路','自由日','悉尼','Kiama','悉尼','返程']
const tabs=[['timeline','calendar','每日行程'],['route','route','旅途全览'],['packing','bag','行前清单'],['reminders','bell','提醒核对']]
const Icon=({name,className=''})=><Image className={`icon ${className}`} src={icons[name]||icons.spot} mode='aspectFit'/>
const Button=({children,className='',...props})=><View {...props} className={`ui-button ${className}`} ariaRole='button' tabIndex={0} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();props.onClick?.(event)}}}>{children}</View>

function DetailPhoto({photo,photos}) {
  const [failed,setFailed]=useState(false)
  return <View className='dish-photo-card'>
    {failed?<View className='dish-photo-fallback' onClick={()=>setFailed(false)} ariaRole='button'>图片加载失败，点击重试</View>:<Image className='dish-photo' src={photo.src} mode='widthFix' lazyLoad onError={()=>setFailed(true)} onClick={()=>Taro.previewImage({current:photo.src,urls:photos.map(p=>p.src)}).catch(()=>Taro.showToast({title:'暂时无法预览图片',icon:'none'}))} ariaLabel={`放大查看${photo.caption}`}/>}
    <Text className='dish-photo-caption'>{photo.caption}</Text>
    {photo.author&&<Text className='photo-source' onClick={()=>Taro.setClipboardData({data:photo.sourceUrl}).catch(()=>Taro.showToast({title:'暂时无法复制来源',icon:'none'}))}>小红书 · {photo.author} · 复制来源 ↗</Text>}
  </View>
}

export default function Index() {
  const [header]=useState(headerLayout)
  const [tab,setTab]=useState('timeline')
  const [active,setActive]=useState(()=>{const i=originalDays.findIndex(d=>d.date===localDay(new Date(),d.zone));return i<0?1:i})
  const [filter,setFilter]=useState('all'),[query,setQuery]=useState('')
  const [done,setDone]=useState(()=>readStored('aussie-done',{}))
  const [packed,setPacked]=useState(()=>readStored('aussie-packed',{}))
  const [times]=useState(()=>readStored('aussie-times',{}))
  const [now,setNow]=useState(Date.now()),[foreground,setForeground]=useState(true)
  const [reminders,setReminders]=useState(()=>readStored('aussie-reminders',false))
  const [modal,setModal]=useState(null)
  const sent=useRef(new Set())
  const days=useMemo(()=>originalDays.map(d=>({...d,events:d.events.map(e=>Object.prototype.hasOwnProperty.call(times,e.id)?{...e,time:times[e.id],edited:true}:e)})),[times])
  const day=days[active],upcoming=nextEvent(days,new Date(now),done)
  const completeCount=day.events.filter(e=>done[e.id]).length
  const selectedEvent=modal?.id?days.flatMap(d=>d.events).find(e=>e.id===modal.id):null
  const restaurant=restaurantFor(selectedEvent)
  const spotGuide=spotGuideFor(selectedEvent)
  const selectedDay=selectedEvent?days.find(d=>d.events.some(e=>e.id===selectedEvent.id)):day
  useDidShow(()=>{setForeground(true);setNow(Date.now())})
  useDidHide(()=>setForeground(false))
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(id)},[])
  useEffect(()=>{Taro.pageScrollTo({scrollTop:0,duration:0}).catch(()=>{})},[tab])
  useEffect(()=>{
    if(!reminders||!foreground)return
    const due=days.flatMap(d=>d.events.map(e=>({d,e,at:eventInstant(d,e)}))).find(({e,at})=>at&&!e.optional&&!e.tentative&&!done[e.id]&&!sent.current.has(e.id)&&+at>=now&&+at-now<=30*60000)
    if(due){sent.current.add(due.e.id);Taro.showModal({title:'接下来的安排',content:`${due.e.time} ${due.e.title}（${due.d.city}当地时间）`,showCancel:false,confirmColor:'#24594d'})}
  },[now,reminders,foreground,days,done])
  function chooseDay(i){setActive(i);setFilter('all');setQuery('');setTab('timeline')}
  function toggleDone(id){const next={...done,[id]:!done[id]};setDone(next);store('aussie-done',next)}
  function togglePacked(id){const next={...packed,[id]:!packed[id]};setPacked(next);store('aussie-packed',next)}
  function showEvent(e){setModal({type:'event',id:e.id})}
  function renderEvent(e){return <View key={e.id} className={`event ${done[e.id]?'completed':''}`}>
    <View className='event-time'><Text className='time-value'>{e.time||(e.flexible?'当天决定':'待安排')}</Text><Text className='time-hint'>{e.flexible?'自由安排':e.tentative?'参考时间':e.optional?'备选':e.edited?'自定时间':e.time?'计划时间':'按顺序游览'}</Text></View>
    <View className={`timeline-dot ${e.type}`}><Icon name={e.type}/></View>
    <View className='event-card'>
      <View className='event-open' onClick={()=>showEvent(e)} ariaRole='button' ariaLabel={`查看${e.title}`}>
        <View className='event-tags'><Text className={`type ${e.type}`}>{labels[e.type]}</Text>{e.tentative&&<Text className='optional'>参考／草案</Text>}{e.city&&<Text className='optional'>{e.city}时间</Text>}{e.optional&&<Text className='optional'>可选行程</Text>}{done[e.id]&&<Text className='finished-label'>已完成</Text>}</View>
        <Text className='event-title'>{e.title}</Text><Text className='event-note'>{restaurantFor(e)?.itineraryNote||e.note}</Text>
      </View>
      <View className='event-actions'><Text className='event-place'>{e.place||'地点待确认'}</Text><View className='action-group'>
        {e.place&&<Button className='navigate' onClick={()=>navigateToPlace(e)} ariaLabel={`${locationLabel(e,process.env.TARO_ENV)}：${e.place}`}><Icon name='pin'/>{locationLabel(e,process.env.TARO_ENV)}</Button>}
        <Button className='complete-button' onClick={()=>toggleDone(e.id)} ariaLabel={`${done[e.id]?'撤销完成':'标记完成'}：${e.title}`}><Text>{done[e.id]?'✓':'○'}</Text></Button>
      </View></View>
    </View>
  </View>}
  function renderTimeline(){const filtered=day.events.filter(e=>(filter==='all'||e.type===filter)&&(e.title+e.note+e.place).toLowerCase().includes(query.toLowerCase()));return <>
    <View className='content-grid'><View className='itinerary'>
      <View className='section-heading'><View><Text className='eyebrow'>{day.en}</Text><Text className='section-title'>{day.title}</Text><Text className='section-subtitle'>{day.subtitle}</Text></View><Text className='day-progress'>{completeCount}/{day.events.length} 已完成</Text></View>
      <View className='timeline-toolbar'><ScrollView scrollX className='filter-scroll' showScrollbar={false}><View className='filters'>{[['all','全部'],['spot','探索'],['food','美食'],['transit','交通'],['flight','航班'],['hotel','住宿'],['shop','购物']].map(([id,l])=><Button key={id} onClick={()=>setFilter(id)} className={filter===id?'chosen':''}>{l}</Button>)}</View></ScrollView><Button className='text-button original-button' onClick={()=>setModal({type:'notes'})}>原备注 ↗</Button></View>
      <View className='search-field'><Icon name='search'/><Input value={query} onInput={e=>setQuery(e.detail.value)} placeholder='搜索当天景点、餐厅、备注…' ariaLabel='搜索当天行程'/>{!!query&&<Button onClick={()=>setQuery('')} ariaLabel='清除搜索'>×</Button>}</View>
      <View className='events'>{filtered.length?filtered.map(renderEvent):<View className='empty'>没有匹配的安排，换个关键词试试。</View>}</View>
    </View></View>
    {upcoming&&<Button className='upcoming-strip' onClick={()=>chooseDay(upcoming.day.number)}><Icon name='clock'/><Text>下一项 · {upcoming.day.date.slice(5).replace('-','.')} {upcoming.event.time} {upcoming.event.title}</Text><Text>→</Text></Button>}
  </>}
  function renderRoute(){return <><View className='view-heading'><Text className='eyebrow'>YOUR JOURNEY, AT A GLANCE</Text><Text className='section-title'>从城市，到海岸线</Text><Text className='muted'>9 天（含出发日）· 点开任意一天查看行程</Text></View><View className='route-overview'><View className='route-line'><Text>上海</Text><Text>✈</Text><Text>吉隆坡</Text><Text>✈</Text><Text>墨尔本</Text><Text>✈</Text><Text>悉尼</Text></View><Text className='muted'>路线示意 · 大洋路从墨尔本往返，Kiama 从悉尼往返</Text></View><View className='overview-grid'>{days.map((d,i)=><View key={d.date} className='overview-card' onClick={()=>chooseDay(i)} ariaRole='button'><View className='overview-top'><Text>{i===0?'DEPARTURE':`DAY ${i}`}</Text><Text>{d.date.slice(5).replace('-','.')}</Text></View><View className={`overview-icon ${i===3||i===6?'coast':''}`}><Icon name={i===0||i===5||i===8?'flight':i===3||i===6?'spot':'compass'}/></View><Text className='overview-title'>{d.city}</Text><Text className='overview-subtitle'>{d.title}</Text><View className='overview-bottom'><Text>{d.events.length} 项安排</Text><Text>→</Text></View></View>)}</View><Button className='upcoming-strip' onClick={()=>setModal({type:'catalog'})}><Icon name='compass'/><Text>景点备选库 · {source.attractions.length} 个地点</Text><Text>→</Text></Button></>}
  function renderPacking(){return <><View className='view-heading'><Text className='eyebrow'>READY, SET, GO</Text><Text className='section-title'>打包一份好心情</Text><Text className='muted'>来自原表的 {source.packing.length} 项准备事项，勾选保存在当前设备。</Text></View><View className='packing-summary'><Text className='packed-number'>{source.packing.filter(p=>packed[p.id]).length}<Text className='unit'> / {source.packing.length} 已准备</Text></Text><Text className='muted'>原表对转接头有不同备注，装包前请核对充电器。</Text></View><View className='packing-groups'>{['行前准备','随身背包','行李箱'].map(group=><View key={group} className='packing-group'><View className='group-title'><Icon name='bag'/><Text>{group}</Text></View>{source.packing.filter(p=>p.group===group).map(p=><View key={p.id} className={`check-row ${packed[p.id]?'checked':''}`} onClick={()=>togglePacked(p.id)} ariaRole='checkbox' ariaChecked={!!packed[p.id]}><View className='check-box'>{packed[p.id]?'✓':''}</View><Text>{p.label}</Text></View>)}</View>)}</View></>}
  function renderReminders(){return <><View className='view-heading'><Text className='eyebrow'>A LITTLE PEACE OF MIND</Text><Text className='section-title'>让提醒，替你记着</Text><Text className='muted'>有明确时间的安排提前提醒；未定、可选与参考草案不自动加入日历。</Text></View><View className='reminder-options'><View className='mini-card'><View className='feature-icon'><Icon name='calendar'/></View><Text className='feature-title'>手机日历提醒</Text><Text className='feature-description'>导出 .ics 后导入手机日历，提前 30 分钟提醒。请确认日历通知开启；更改行程后同步更新日历，避免重复导入。</Text><Button className='button dark' onClick={()=>exportCalendar(days)}><Icon name='download'/>{process.env.TARO_ENV==='h5'?'下载日历文件':'分享日历文件'}</Button></View><View className='mini-card'><View className='feature-icon peach'><Icon name='bell'/></View><View className='switch-row'><Text className='feature-title'>应用内提醒</Text><Switch checked={reminders} color='#24594d' onChange={e=>{setReminders(e.detail.value);store('aussie-reminders',e.detail.value)}}/></View><Text className='feature-description'>仅在页面打开期间提示即将开始的事项。离开小程序或锁屏后，请依靠日历通知。</Text><View className='subscription-note'><Text>微信订阅消息 · 尚未接入</Text><Text className='muted'>暂未开通，可先使用手机日历接收离线提醒。</Text></View></View></View><Text className='issues-title'>原计划里，有 {issues.length} 处需要留意</Text><View className='issues'>{issues.map(i=><View className='issue' key={i.title}><Text className='issue-date'>{i.date}</Text><View className='issue-body'><Text className='issue-title'>{i.title}</Text><Text className='issue-text'>{i.text}</Text></View></View>)}</View><Text className='source-disclaimer'>{source.importedAt.replaceAll('-','.')} 飞书快照 · 修订 {source.revision} · 不会自动同步原表修改。时间、票价、营业信息和取消条款未重新核实；原表浮动图片未导入。</Text><Button className='text-button' onClick={()=>openSource(null,'wqGvS6')}>复制飞书原计划链接 ↗</Button></>}
  const noteRows=day.range?source.rows.filter(r=>r.row>=day.range[0]&&r.row<=day.range[1]):[]
  return <View className='app-shell'>
    <View className='main'>
      <View className='travel-header' style={{paddingTop:header.statusTop}}>
        <Image src={coast} className='header-coast' mode='aspectFill'/><View className='header-wash'/>
        <View className='travel-nav' style={{height:header.navHeight,paddingRight:header.rightInset}}>
          <Text className='travel-brand'>澳游<Text className='travel-brand-en'> AUSSIE DAYS</Text></Text>
        </View>
        <View className='header-summary'><View><Text className='header-title'>{tab==='timeline'?day.city:tabs.find(t=>t[0]===tab)[2]}</Text><Text className='header-caption'>9.25 — 10.03 · 澳大利亚</Text></View></View>
        {tab==='timeline'&&<>
<ScrollView scrollX className='day-scroll' enhanced showScrollbar={false} scrollIntoView={`day-${active}`} scrollWithAnimation><View className='day-strip'>{days.map((d,i)=><View key={d.date} id={`day-${i}`} onClick={()=>chooseDay(i)} className={`day ${i===active?'active':''}`} ariaRole='button' ariaLabel={`${d.date} ${d.city}`}><Text className='day-date'>{d.date.slice(5).replace('-','.')}</Text><Text className='day-city'>{dayNames[i]}</Text></View>)}</View></ScrollView>
        </>}
      </View>
      <View className='page'>
      {tab==='timeline'?renderTimeline():tab==='route'?renderRoute():tab==='packing'?renderPacking():renderReminders()}
      <View className='footer'><Text>MADE FOR YOUR LITTLE ADVENTURE</Text><Text>来自飞书计划 · 旅行当地时间 · 本地保存</Text></View>
    </View></View>
    <View className='bottom-nav'>{tabs.map(([id,i,l])=><Button key={id} className={`bottom-tab ${tab===id?'selected':''}`} onClick={()=>setTab(id)}><Icon name={i}/><Text>{l}</Text>{tab===id&&<View className='active-indicator'/>}</Button>)}</View>
    {modal&&<View className='modal-mask' onClick={()=>setModal(null)}><View className='modal-panel' onClick={e=>e.stopPropagation()}><Button className='close-modal' ariaLabel='关闭详情' onClick={()=>setModal(null)}>×</Button><ScrollView scrollY className='modal-scroll'><View className='modal-content'>
      {modal.type==='catalog'?<><Text className='eyebrow'>PLACES TO EXPLORE</Text><Text className='modal-title'>景点备选库</Text><Text className='modal-intro'>同步自飞书 Sheet1；标记偏好不代表已安排进当天行程。</Text>{source.attractions.map(a=><View className='original-note' key={a.row}><Text className='row-number'>{a.city}{a.preferred?' · 原表偏好':''}</Text><Text className='original-title'>{a.title}</Text><Text className='original-text'>{[a.description,a.note].filter(Boolean).join('\n')}</Text></View>)}<Button className='text-button' onClick={()=>openSource(null,'71e069')}>复制景点库原表链接 ↗</Button></>:modal.type==='notes'?<><Text className='eyebrow'>THE ORIGINAL NOTES</Text><Text className='modal-title'>{day.date.slice(5).replace('-','.')} · 原计划随身看</Text><Text className='modal-intro'>原文包含执行安排、旧备选和草案，请以各段说明为准。9/30旧购物路线与10/2旧Coogee–Watsons长线不加入当前行程。</Text>{noteRows.length?noteRows.map(r=><View className='original-note' key={r.row}><Text className='row-number'>原表第 {r.row} 行</Text><Text className='original-title'>{r.cells.slice(0,3).filter(Boolean).join(' · ')||'补充备注'}</Text><Text className='original-text'>{r.cells.slice(3,5).filter(Boolean).join('\n')}</Text></View>):<Text className='modal-intro'>详细表中没有当天安排，请核对汇总表及航班确认单。</Text>}<Button className='text-button' onClick={()=>openSource(null,day.range?'BWm0nP':'wqGvS6')}>复制飞书原表链接 ↗</Button></>:<><Text className='eyebrow'>{selectedDay.date} · {selectedEvent.city||selectedDay.city}当地时间</Text><Text className='modal-title'>{selectedEvent.title}</Text><Text className={`type ${selectedEvent.type}`}>{labels[selectedEvent.type]}</Text>{selectedEvent.type==='food'&&<View className='restaurant-section'>
        <Text className='dish-section-title'>推荐菜</Text>
        {restaurant?<>
          <Text className='dish-source'>{restaurant.sourceLabel||(restaurant.earlierGuide?'来自早期攻略的餐厅资料，供点菜参考':'来自旅行攻略，供点菜参考')} · 以到店菜单为准</Text>
          <View className='dish-list'>{restaurant.dishes.map((dish,i)=><View className='dish-row' key={dish}><Text className='dish-index'>{String(i+1).padStart(2,'0')}</Text><Text className='dish-name'>{dish}</Text></View>)}</View>
          {restaurant.recommendationNote&&<Text className='dish-recommendation'>{restaurant.recommendationNote}</Text>}
          {restaurant.additionalDishes?.length>0&&<><Text className='dish-photo-heading'>食客补充推荐</Text><Text className='dish-source'>来自小红书用餐体验，供点菜参考</Text><View className='dish-list'>{restaurant.additionalDishes.map(dish=><View className='dish-row' key={dish}><Text className='dish-name'>{dish}</Text></View>)}</View></>}
          {restaurant.photos?.length?<><Text className='dish-photo-heading'>菜品图片<Text className='dish-photo-hint'>点击放大</Text></Text>{restaurant.photos.map(photo=><DetailPhoto key={photo.src} photo={photo} photos={restaurant.photos}/>)}</>:<Text className='dish-empty'>菜品照片待补充</Text>}
        </>:<Text className='dish-empty'>此餐暂无推荐菜，按当天选择的餐厅点餐。</Text>}
      </View>}{spotGuide&&<View className='spot-guide'>
        <Text className='dish-section-title'>拍照机位</Text>
        <Text className='dish-source'>{spotGuide.sourceLabel||'结合攻略整理'} · 以现场开放区域为准</Text>
        <View className='dish-list'>{spotGuide.locations.map((location,i)=><View className='dish-row' key={location}><Text className='dish-index'>{String(i+1).padStart(2,'0')}</Text><Text className='dish-name'>{location}</Text></View>)}</View>
        {spotGuide.photos.length>0&&<><Text className='dish-photo-heading'>实景参考<Text className='dish-photo-hint'>点击放大</Text></Text>{spotGuide.photos.map(photo=><DetailPhoto key={photo.src} photo={photo} photos={spotGuide.photos}/>)}</>}
        {spotGuide.posePhotos?.length>0&&<><Text className='dish-photo-heading'>姿势推荐图<Text className='dish-photo-hint'>实拍参考 · 点击放大</Text></Text>{spotGuide.posePhotos.map(photo=><DetailPhoto key={photo.src} photo={photo} photos={spotGuide.posePhotos}/>)}</>}
        {spotGuide.poseIds.length>0&&<><Text className='dish-photo-heading'>姿势推荐图<Text className='dish-photo-hint'>动作示意 · 非实景</Text></Text><View className='pose-grid'>{spotGuide.poseIds.map(id=><View className='pose-card' key={id}><DetailPhoto photo={{src:poses[id].src,caption:poses[id].title}} photos={spotGuide.poseIds.map(key=>({src:poses[key].src}))}/><Text className='pose-tip'>{poses[id].tip}</Text></View>)}</View></>}
      </View>}<Text className='modal-intro'>{restaurant?.itineraryNote||selectedEvent.note}</Text></>}
    </View></ScrollView></View></View>}
  </View>
}
