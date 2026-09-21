import fs from 'node:fs'
import { createHash } from 'node:crypto'
const read = path => JSON.parse(fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
function csvRow(input) {
  const cells = []; let value = '', quoted = false
  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    if (c === '"') { if (quoted && input[i+1] === '"') { value += '"'; i++ } else quoted = !quoted }
    else if (c === ',' && !quoted) { cells.push(value); value = '' }
    else value += c
  }
  cells.push(value.trimEnd()); return cells
}
const manifest = read('data/source.json')
function loadRows(path, expected) {
  const source = read(path)
  if (!source.ok || source.data.has_more || source.data.revision !== manifest.revision) throw Error(`Incomplete or mixed-revision snapshot: ${path}`)
  const rows = [...source.data.annotated_csv.matchAll(/^\[row=(\d+)\] ([\s\S]*?)(?=^\[row=\d+\] |$(?![\s\S]))/gm)].map(m => ({ row: +m[1], cells: csvRow(m[2]) }))
  if (rows.length !== expected || rows.some((r,i) => r.row !== i+1)) throw Error(`Missing source rows: ${path}`)
  return rows
}
const rows = loadRows('data/detail.json', manifest.rowCounts.detail)
const summaryRows = loadRows('data/summary.json', manifest.rowCounts.summary)
const attractionRows = loadRows('data/attractions.json', manifest.rowCounts.attractions)
const previous = fs.existsSync('data/trip-notes.json') ? read('data/trip-notes.json') : {packing:[]}
const packing = []
for (const row of summaryRows.filter(x => x.row >= 4 && x.row <= 33)) {
  for (const [column, group] of [[7,'行前准备'],[8,'随身背包'],[11,'行李箱'],[12,'行李箱']]) {
    const label = row.cells[column]?.trim().replace(/^\d+[、.．]\s*/, '')
    if (!label) continue
    const matching = previous.packing.find(p => p.group === group && p.label === label)
    const id = matching?.id || `pack-${createHash('sha256').update(group+'|'+label).digest('hex').slice(0,12)}`
    packing.push({id,label,group})
  }
}
let city = ''
const attractions = attractionRows.flatMap(r => {
  if (r.row === 1) return []
  if (r.cells[0]) city = r.cells[0]
  if (!r.cells[1] || r.cells[1] === '其他') return []
  return [{row:r.row,city,title:r.cells[1],description:r.cells[2],note:r.cells[4],preferred:r.cells[5]?.includes('✅') || false}]
})
fs.writeFileSync('data/trip-notes.json', JSON.stringify({revision:manifest.revision, importedAt:manifest.importedAt, rows:rows.filter(r => r.cells.slice(0,5).some(c=>c.trim())), packing, attractions},null,2)+'\n')
console.log(`Imported ${rows.length} source rows, ${packing.length} checklist items, ${attractions.length} attractions`)
