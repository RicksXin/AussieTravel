export function localDay(now,zone='Australia/Melbourne'){
  // Some WeChat JS runtimes have no Intl. This fallback is scoped to this
  // September 25–October 3 itinerary (before the daylight-saving change).
  if(typeof Intl!=='undefined'&&Intl.DateTimeFormat){try{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const get=t=>parts.find(p=>p.type===t).value;return `${get('year')}-${get('month')}-${get('day')}`}catch{}}
  const hours=zone==='Asia/Shanghai'||zone==='Asia/Kuala_Lumpur'?8:10;
  return new Date(+now+hours*3600000).toISOString().slice(0,10)
}
export function eventInstant(day,event){if(!event.time)return null;return new Date(`${day.date}T${event.time}:00${event.offset||day.offset}`)}
export function nextEvent(days,now,done={}){return days.flatMap(day=>day.events.map(event=>({day,event,at:eventInstant(day,event)}))).filter(x=>x.at&&x.at>=now&&!done[x.event.id]&&!x.event.optional&&!x.event.tentative).sort((a,b)=>a.at-b.at)[0]||null}
export function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
export function foldLine(line){let out='',bytes=0;for(const c of line){const length=encodeURIComponent(c).replace(/%[A-F\d]{2}/gi,'x').length;if(bytes+length>75){out+='\r\n ';bytes=1}out+=c;bytes+=length}return out}
export function ics(days){const escape=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');const stamp=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//AussieTravel//CN','CALSCALE:GREGORIAN'];for(const day of days)for(const e of day.events){const at=eventInstant(day,e);if(!at||e.optional||e.tentative)continue;lines.push('BEGIN:VEVENT',`UID:${e.id}@aussie-travel`,`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(at)}`,`DTEND:${stamp(new Date(+at+30*60000))}`,`SUMMARY:${escape(e.title)}`,`DESCRIPTION:${escape('原计划时间；请按实际预订核对。日历显示为30分钟占位，并非实际活动时长。'+e.note)}`,`LOCATION:${escape(e.place||day.city)}`,'BEGIN:VALARM','TRIGGER:-PT30M','ACTION:DISPLAY',`DESCRIPTION:${escape(e.title)}`,'END:VALARM','END:VEVENT')}lines.push('END:VCALENDAR');return lines.map(foldLine).join('\r\n')+'\r\n'}
