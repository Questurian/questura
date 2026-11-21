import assert from 'node:assert/strict'
import test from 'node:test'
import {
  activeZoomFor,
  cameraForPoints,
  framedPoints,
  haversineMeters,
  latFromMercatorY,
  mercatorY,
  shiftCenterSouthByPixels,
} from './mapCamera.ts'

const FIT = {
  width: 600,
  height: 800,
  padding: 56,
  maxZoom: 17,
  zoomOut: 1.5,
  singlePointZoom: 15,
  fallback: { center: { lat: -12.0464, lng: -77.0428 }, zoom: 13 },
}

const LIMA = { lat: -12.0464, lng: -77.0428 }

test('mercator round-trips', () => {
  for (const lat of [-60, -12.0464, 0, 33.7, 71.2]) {
    assert.ok(Math.abs(latFromMercatorY(mercatorY(lat)) - lat) < 1e-9)
  }
})

test('haversine matches a known short distance', () => {
  const meters = haversineMeters(LIMA, { lat: -12.0464, lng: -77.0328 })
  assert.ok(meters > 1000 && meters < 1150, `got ${meters}`)
})

test('a zero inset leaves the centre alone', () => {
  assert.deepEqual(shiftCenterSouthByPixels(LIMA, 16, 0), LIMA)
})

test('shifting south lowers the latitude and keeps longitude', () => {
  const shifted = shiftCenterSouthByPixels(LIMA, 16, 200)
  assert.ok(shifted.lat < LIMA.lat)
  assert.equal(shifted.lng, LIMA.lng)
})

test('the same pixel shift covers less ground as zoom increases', () => {
  const near = LIMA.lat - shiftCenterSouthByPixels(LIMA, 18, 200).lat
  const far = LIMA.lat - shiftCenterSouthByPixels(LIMA, 14, 200).lat
  assert.ok(far > near)
})

test('no points falls back to the city overview', () => {
  assert.deepEqual(cameraForPoints([], FIT), FIT.fallback)
})

test('a single point uses the overview zoom and centres on it', () => {
  const camera = cameraForPoints([LIMA], FIT)
  assert.equal(camera.zoom, FIT.singlePointZoom)
  assert.deepEqual(camera.center, LIMA)
})

test('a single point is pushed south when the sheet hides the lower half', () => {
  const camera = cameraForPoints([LIMA], { ...FIT, insetBottom: 400 })
  assert.ok(camera.center.lat < LIMA.lat)
})

test('many points fit inside the max zoom, backed off by the zoom-out', () => {
  const camera = cameraForPoints(
    [LIMA, { lat: -12.1, lng: -77.03 }, { lat: -12.09, lng: -77.06 }],
    FIT,
  )
  assert.ok(camera.zoom <= FIT.maxZoom - FIT.zoomOut)
  assert.ok(camera.center.lat < LIMA.lat && camera.center.lat > -12.1)
})

test('hiding part of the map zooms further out to keep every pin visible', () => {
  const open = cameraForPoints([LIMA, { lat: -12.1, lng: -77.03 }], FIT)
  const half = cameraForPoints([LIMA, { lat: -12.1, lng: -77.03 }], {
    ...FIT,
    insetBottom: 400,
  })
  assert.ok(half.zoom < open.zoom)
})

const ACTIVE_ZOOM_OPTIONS = {
  baseZoom: 16,
  maxZoom: 17.5,
  minSeparationPx: 26,
  ignoreWithinMeters: 12,
}

test('active zoom stays at the base when neighbours are far', () => {
  const active = { lat: -12.12, lng: -77.03 }
  const far = { lat: -12.13, lng: -77.03 } // ~1.1 km
  assert.equal(activeZoomFor(active, [active, far], ACTIVE_ZOOM_OPTIONS), 16)
})

test('active zoom steps in until a close neighbour clears the gap', () => {
  const active = { lat: -12.12, lng: -77.03 }
  const near = { lat: -12.12, lng: -77.0296 } // ~44 m east
  const zoom = activeZoomFor(active, [active, near], ACTIVE_ZOOM_OPTIONS)
  assert.ok(zoom > 16 && zoom < 17.5)
  // At that zoom the neighbour sits exactly minSeparationPx away.
  const px = ((near.lng - active.lng) / 360) * 256 * 2 ** zoom
  assert.ok(Math.abs(px - 26) < 0.01)
})

test('active zoom caps at the max and ignores same-building neighbours', () => {
  const active = { lat: -12.12, lng: -77.03 }
  const sameDoor = { lat: -12.12, lng: -77.02995 } // ~5 m
  assert.equal(activeZoomFor(active, [active, sameDoor], ACTIVE_ZOOM_OPTIONS), 16)
  const tight = { lat: -12.12, lng: -77.02987 } // ~14 m
  assert.equal(activeZoomFor(active, [active, tight], ACTIVE_ZOOM_OPTIONS), 17.5)
})

test('overview drops a far stray but keeps a spread-out guide whole', () => {
  const cluster = [
    { lat: -12.1205, lng: -77.0322 },
    { lat: -12.1214, lng: -77.0283 },
    { lat: -12.1320, lng: -77.0305 },
    { lat: -12.1431, lng: -77.0156 },
    { lat: -12.1471, lng: -77.0222 },
    { lat: -12.1382, lng: -77.0192 },
    { lat: -12.1237, lng: -77.0360 },
    { lat: -12.1504, lng: -77.0206 },
    { lat: -12.1219, lng: -77.0318 },
    { lat: -12.1449, lng: -77.0188 },
  ]
  const stray = { lat: -12.0502, lng: -77.0366 } // central Lima, ~8 km north
  const framed = framedPoints([...cluster, stray])
  assert.equal(framed.length, cluster.length)
  assert.ok(!framed.includes(stray))

  // Short lists are never trimmed.
  assert.equal(framedPoints([...cluster.slice(0, 4), stray]).length, 5)

  // Evenly spread stops have no strays.
  const spread = Array.from({ length: 8 }, (_, i) => ({ lat: -12 - i * 0.02, lng: -77 }))
  assert.equal(framedPoints(spread).length, 8)
})
