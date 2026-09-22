import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { days } from '../src/data.js'
import { localDay, eventInstant, nextEvent, ics, foldLine } from '../src/logic.js'

test('Shanghai departure and Australian arrival use different UTC offsets',()=>{
 assert.equal(eventInstant(days[0],days[0].events[0]).toISOString(),'2026-09-25T04:30:00.000Z')
 assert.equal(eventInstant(days[1],days[1].events[0]).toISOString(),'2026-09-25T22:20:00.000Z')
 assert.equal(localDay(new Date('2026-09-25T15:00:00Z'),'Australia/Melbourne'),'2026-09-26')
 assert.equal(localDay(new Date('2026-09-25T15:00:00Z'),'Asia/Shanghai'),'2026-09-25')
})
test('next reminder excludes completed, untimed and optional plans',()=>{
 const now=new Date('2026-09-30T07:20:00Z')
 const next=nextEvent(days,now)
 assert.equal(next.event.title,'晚餐 · Hello Auntie')
 const skipped=nextEvent(days,now,{[next.event.id]:true})
 assert.equal(skipped.event.title,'前往悉尼歌剧院')
 assert.equal(nextEvent(days,new Date('2026-10-04T00:00:00Z')),null)
})
test('ICS contains only scheduled non-optional events, UTC dates and 30 minute alarms',()=>{
 const text=ics(days),unfolded=text.replace(/\r\n /g,'')
 const count=days.flatMap(d=>d.events).filter(e=>e.time&&!e.optional&&!e.tentative).length
 assert.equal((text.match(/BEGIN:VEVENT/g)||[]).length,count)
 assert.equal((text.match(/TRIGGER:-PT30M/g)||[]).length,count)
 assert.match(text,/DTSTART:20260926T003000Z/)
 assert.match(text,/DTSTART:20260925T222000Z/)
 assert.ok(!unfolded.includes('SUMMARY:Plan A'))
 assert.ok(!unfolded.includes('SUMMARY:墨尔本自由行'))
 assert.ok(text.split('\r\n').every(line=>Buffer.byteLength(line,'utf8')<=75))
 assert.equal(foldLine('中文😀'.repeat(30)).replace(/\r\n /g,''),'中文😀'.repeat(30))
})
test('all source rows are imported, IDs unique and dates continuous',()=>{
 const raw=JSON.parse(fs.readFileSync('data/detail.json','utf8').replace(/^\uFEFF/,''))
 assert.equal(raw.data.has_more,false)
 assert.equal(raw.data.row_count,474)
 const notes=JSON.parse(fs.readFileSync('data/trip-notes.json','utf8'))
 assert.ok(notes.rows.some(r=>r.row===468))
 assert.equal(notes.packing.length,88)
 const ids=days.flatMap(d=>d.events.map(e=>e.id))
 assert.equal(new Set(ids).size,ids.length)
 assert.equal(days.length,9)
 assert.equal(days[8].date,'2026-10-03')
})

test('revision 946 has new flights, reservations and no retired execution routes',()=>{
 const flight = days[5].events.find(e=>e.title.startsWith('JQ516'))
 assert.equal(flight.time,'13:55')
 assert.ok(flight.note.includes('15:20'))
 assert.ok(days[5].events.some(e=>e.title.includes('My Fair Lady')&&e.time==='19:30'))
 assert.ok(days[2].events.some(e=>e.place==='Max on Hardware Melbourne'&&e.time==='12:00'))
 assert.ok(!days[1].events.some(e=>e.place==='Max on Hardware Melbourne'))
 assert.ok(!days[5].events.some(e=>/Market City|Darling Harbour|Observatory/.test(e.place||'')))
 assert.ok(!days[7].events.some(e=>/Coogee|Watsons/.test(e.place||'')))
 assert.equal(days[3].events[0].time,null)
 assert.equal(days[3].events[0].place,"206 A'Beckett St Melbourne")
 assert.equal(days[4].events.length,10) // 7 imported plans plus resupply, Jasper Coffee and the campus shop
 assert.ok(days[7].events.every(e=>e.tentative))
 const calendar=ics(days).replace(/\r\n /g,'')
 for(const e of days.flatMap(d=>d.events).filter(e=>e.tentative)) assert.ok(!calendar.includes(`UID:${e.id}@`))
 const departure=days[8].events.find(e=>e.title.startsWith('MU562'))
 const arrival=days[8].events.find(e=>e.city==='上海')
 assert.equal(eventInstant(days[8],departure).toISOString(),'2026-10-03T01:00:00.000Z')
 assert.equal(eventInstant(days[8],arrival).toISOString(),'2026-10-03T11:25:00.000Z')
 assert.equal(nextEvent([days[7]],new Date('2026-10-01T20:00:00Z')),null)
})

test('the Great Ocean Road tour follows the five stops the operator confirmed',()=>{
 const tour=days[3].events.filter(e=>/第 \d 站/.test(e.title))
 assert.deepEqual(tour.map(e=>e.place),['Twelve Apostles Victoria','Gibson Steps Victoria','Loch Ard Gorge Victoria','Great Ocean Road Wildlife Park','Apollo Bay Victoria'])
 // The wildlife park costs extra and can be skipped, so it must never drive a reminder.
 assert.ok(tour.find(e=>e.place==='Great Ocean Road Wildlife Park').optional)
 // The operator gave no times for any stop, so none may look scheduled.
 for(const e of days[3].events) assert.equal(e.time,null,e.title)
 // Stops the original table listed but the operator's itinerary dropped.
 for(const gone of ['Great Ocean Road Memorial Arch']) assert.ok(!days[3].events.some(e=>e.place===gone),gone)
 for(const gone of ['Light-Cradling Nook','小红帽灯塔','寻找野生考拉']) assert.ok(!days[3].events.some(e=>e.title.includes(gone)),gone)
 // Retired IDs must not be reused, or a stale completion tick would land on a different stop.
 const ids=new Set(days.flatMap(d=>d.events.map(e=>e.id)))
 for(const retired of ['2026-09-28-4','2026-09-28-6','2026-09-28-7','2026-09-28-8']) assert.ok(!ids.has(retired),retired)
 assert.match(days[3].events[0].note,/在这里下车/)
})

test('each staying night ends with an untimed resupply stop that stays out of the calendar',()=>{
 // 9/25 is an overnight flight and 10/03 flies home, so neither has a supermarket run.
 const expected={'2026-09-26':'Coles Melbourne CBD','2026-09-27':'Coles Melbourne CBD','2026-09-28':'Coles Melbourne CBD',
  '2026-09-29':'Coles Melbourne CBD','2026-09-30':'Coles World Square Sydney','2026-10-02':'Coles World Square Sydney'}
 const calendar=ics(days).replace(/\r\n /g,'')
 for(const [date,place] of Object.entries(expected)) {
  const day=days.find(d=>d.date===date)
  const last=day.events[day.events.length-1]
  assert.equal(last.type,'shop',date)
  assert.equal(last.place,place,date)
  assert.match(last.title,/补给/,date)
  // Restocking happens whenever they get back, so it must not fire a reminder or export an event.
  assert.equal(last.time,null,date)
  assert.ok(!calendar.includes(`UID:${last.id}@`),date)
  assert.match(last.note,/次日补给/,date)
 }
 for(const date of ['2026-09-25','2026-10-03']) {
  const day=days.find(d=>d.date===date)
  assert.ok(!day.events.some(e=>/补给/.test(e.title)),date)
 }
})

test('full snapshots and all active source links agree on revision 946',()=>{
 const manifest=JSON.parse(fs.readFileSync('data/source.json','utf8'))
 const notes=JSON.parse(fs.readFileSync('data/trip-notes.json','utf8'))
 assert.equal(manifest.revision,946)
 assert.equal(notes.revision,946)
 assert.equal(notes.attractions.length,22)
 for(const name of ['detail','summary','attractions','routes']) {
  const {data}=JSON.parse(fs.readFileSync(`data/${name}.json`,'utf8'))
  assert.equal(data.revision,manifest.revision)
  assert.equal(data.has_more,false)
  assert.equal(data.row_count,manifest.rowCounts[name])
  assert.equal(new Set(data.row_indices).size,data.row_count)
 }
 for(const day of days) for(const event of day.events) {
  assert.ok(event.row>=day.range[0]&&event.row<=day.range[1],event.title)
  assert.ok(notes.rows.some(r=>r.row===event.row),event.title)
 }
 assert.equal(new Set(notes.packing.map(p=>p.id)).size,notes.packing.length)
})
