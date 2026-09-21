import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
function csvRow(input){const cells=[];let value='',quoted=false;for(let i=0;i<input.length;i++){const c=input[i];if(c==='"'){if(quoted&&input[i+1]==='"'){value+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){cells.push(value);value=''}else value+=c}cells.push(value.trimEnd());return cells}
const detail=read('data/detail.json');if(!detail.ok||detail.data.has_more)throw Error('Incomplete source');
const rows=[...detail.data.annotated_csv.matchAll(/\[row=(\d+)\] ([\s\S]*?)(?=\[row=\d+\] |$)/g)].map(m=>({row:+m[1],cells:csvRow(m[2])}));
if(rows.length!==454)throw Error(`Expected 454 rows, got ${rows.length}`);
const summary=read('data/summary.json');if(!summary.ok||summary.data.has_more)throw Error('Incomplete summary');
const summaryRows=[...summary.data.annotated_csv.matchAll(/\[row=(\d+)\] ([\s\S]*?)(?=\[row=\d+\] |$)/g)].map(m=>({row:+m[1],cells:csvRow(m[2])}));
const packing=[];for(const row of summaryRows.filter(x=>x.row>=4&&x.row<=33)){for(const [column,group] of [[7,'行前准备'],[8,'随身背包'],[11,'行李箱'],[12,'行李箱']]){const label=row.cells[column]?.trim();if(label)packing.push({id:`pack-${row.row}-${column}`,label:label.replace(/^\d+[、.．]\s*/,''),group})}}
fs.writeFileSync('data/trip-notes.json',JSON.stringify({revision:detail.data.revision,importedAt:'2026-09-16',rows:rows.filter(r=>r.cells.slice(0,5).some(c=>c.trim())),packing},null,2));
console.log(`Imported ${rows.length} source rows and ${packing.length} checklist items`);
