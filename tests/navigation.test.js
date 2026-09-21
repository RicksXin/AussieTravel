import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { days } from '../src/data.js'
import { places, locationFor, googleMapsUrl, locationLabel } from '../src/places.js'

test('map points match the source export and cover eight September 26 events', () => {
  const source = JSON.parse(fs.readFileSync('data/map-sep26.json', 'utf8'))
  assert.deepEqual(places, source.places)
  assert.equal(Object.keys(places).length, 7)
  const day = days.find(day => day.date === '2026-09-26')
  assert.equal(day.events.filter(locationFor).length, 8)
  assert.equal(locationFor(day.events[0]).latitude, -37.668997)
  assert.equal(locationFor(day.events[0]).longitude, 144.8483656)
  assert.equal(locationFor({place:'Melbourne Airport Terminal 4'}), null)
  assert.equal(locationFor({place:'Coles Melbourne CBD'}), null)
  assert.equal(locationLabel({place:'Coles Melbourne CBD'}, 'weapp'), '地点')
})

test('Google directions use the imported point or safely encode an unknown place', () => {
  const known = new URL(googleMapsUrl({place:'Operator25 Melbourne'}))
  assert.equal(known.searchParams.get('destination'), '-37.8106796,144.9569892')
  assert.equal(known.searchParams.get('dir_action'), 'navigate')
  assert.equal(known.searchParams.get('api'), '1')
  const name = 'Cafe & Bar #2, Melbourne'
  assert.equal(new URL(googleMapsUrl({place:name})).searchParams.get('destination'), name)
})

test('WeChat opens known coordinates; unknown places and API failures have usable fallbacks', async () => {
  // Exercise platform service branching without the native WeChat runtime.
  let code = fs.readFileSync('src/services.js', 'utf8')
    .replace("import Taro from '@tarojs/taro'", 'export const Taro = {}')
    .replace("'./logic'", JSON.stringify(new URL('../src/logic.js', import.meta.url).href))
    .replace("'./places'", JSON.stringify(new URL('../src/places.js', import.meta.url).href))
    .replaceAll('process.env.TARO_ENV', "'weapp'")
  const {Taro, navigateToPlace} = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
  const opened = [], copied = []
  Taro.openLocation = async options => { opened.push(options) }
  Taro.setClipboardData = async ({data}) => { copied.push(data) }
  Taro.showModal = async () => ({confirm:true})
  Taro.showToast = () => assert.fail('Unexpected error toast')
  Taro.showActionSheet = async () => ({tapIndex:1})
  await navigateToPlace({place:'Operator25 Melbourne'})
  assert.equal(opened[0].latitude, -37.8106796)
  assert.equal(copied.length, 0)
  await navigateToPlace({place:'Coles Melbourne CBD'})
  assert.equal(opened.length, 1)
  assert.equal(new URL(copied[0]).searchParams.get('destination'), 'Coles Melbourne CBD')
  Taro.openLocation = async () => { throw {errMsg:'openLocation:fail'} }
  await navigateToPlace({place:'Operator25 Melbourne'})
  assert.equal(copied.length, 2)
  Taro.openLocation = async () => { throw {errMsg:'openLocation:fail cancel'} }
  await navigateToPlace({place:'Operator25 Melbourne'})
  assert.equal(copied.length, 2)
})
