// Point markers from the user's My Maps KML, not route-snapped coordinates.
// These points are all in Australia, outside China's GCJ-02 offset region.
export const places = {
  "Melbourne Airport Terminal 2": {
    "name": "Terminal 2 - International",
    "latitude": -37.668997,
    "longitude": 144.8483656
  },
  "Oaks Melbourne on William Suites": {
    "name": "350 William St",
    "latitude": -37.8113082,
    "longitude": 144.9564577
  },
  "Operator25 Melbourne": {
    "name": "Operator25",
    "latitude": -37.8106796,
    "longitude": 144.9569892
  },
  "Overlay Coffee Melbourne": {
    "name": "Overlay Coffee",
    "latitude": -37.8115782,
    "longitude": 144.9602798
  },
  "Lune Croissanterie Melbourne CBD on Lonsdale": {
    "name": "Lune Croissanterie Melbourne CBD on Lonsdale",
    "latitude": -37.8146582,
    "longitude": 144.952673
  },
  "Max on Hardware Melbourne": {
    "name": "Max on Hardware",
    "latitude": -37.8133738,
    "longitude": 144.9612479
  },
  "St Kilda Pier Melbourne": {
    "name": "St Kilda Pier",
    "latitude": -37.8647544,
    "longitude": 144.9659159
  }
}

export function locationFor(event) { return places[event.place] || null }
export function googleMapsUrl(event) {
  const point = locationFor(event)
  const destination = point ? `${point.latitude},${point.longitude}` : event.place
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&dir_action=navigate`
}
export function locationLabel(event, platform) {
  return platform === 'h5' || locationFor(event) ? '导航' : '地点'
}
