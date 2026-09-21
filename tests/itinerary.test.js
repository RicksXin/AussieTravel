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
 const now=new Date('2026-09-30T07:00:00Z')
 const next=nextEvent(days,now)
 assert.equal(next.event.title,'晚餐 · Hello Auntie')
 const skipped=nextEvent(days,now,{[next.event.id]:true})
 assert.equal(skipped.day.date,'2026-10-01')
 assert.equal(nextEvent(days,new Date('2026-10-04T00:00:00Z')),null)
})
test('ICS contains only scheduled non-optional events, UTC dates and 30 minute alarms',()=>{
 const text=ics(days),unfolded=text.replace(/\r\n /g,'')
 const count=days.flatMap(d=>d.events).filter(e=>e.time&&!e.optional).length
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
 assert.equal(raw.data.row_count,454)
 const notes=JSON.parse(fs.readFileSync('data/trip-notes.json','utf8'))
 assert.ok(notes.rows.some(r=>r.row===453))
 assert.equal(notes.packing.length,88)
 const ids=days.flatMap(d=>d.events.map(e=>e.id))
 assert.equal(new Set(ids).size,ids.length)
 assert.equal(days.length,9)
 assert.equal(days[8].date,'2026-10-03')
})
