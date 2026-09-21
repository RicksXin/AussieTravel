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
 assert.equal(days[4].events.length,7)
 assert.ok(days[7].events.every(e=>e.tentative))
 const calendar=ics(days).replace(/\r\n /g,'')
 for(const e of days.flatMap(d=>d.events).filter(e=>e.tentative)) assert.ok(!calendar.includes(`UID:${e.id}@`))
 const departure=days[8].events.find(e=>e.title.startsWith('MU562'))
 const arrival=days[8].events.find(e=>e.city==='上海')
 assert.equal(eventInstant(days[8],departure).toISOString(),'2026-10-03T01:00:00.000Z')
 assert.equal(eventInstant(days[8],arrival).toISOString(),'2026-10-03T11:25:00.000Z')
 assert.equal(nextEvent([days[7]],new Date('2026-10-01T20:00:00Z')),null)
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
