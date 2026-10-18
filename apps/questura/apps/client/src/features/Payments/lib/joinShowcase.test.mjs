import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSrcSet } from '../../../components/media/imageSrcSet.ts';
import {
  CATEGORY_PHOTOS,
  CITY_GUIDE_SPREADS,
  LISTICLE_PLACES,
  LOCAL_INTEL_SPREADS,
  staticMapUrl,
} from './joinShowcase.ts';

const photos = [
  ...CATEGORY_PHOTOS.map((photo) => photo.src),
  ...[...CITY_GUIDE_SPREADS, ...LOCAL_INTEL_SPREADS].flatMap((spread) => spread.cards.map((card) => card.src)),
  ...LISTICLE_PLACES.map((place) => place.photo),
];

test('every showcase photo is a CDN variant with a width ladder, so phones never get the 1920px file', () => {
  for (const src of photos) {
    assert.match(src, /^https:\/\/questurian-cdn\.b-cdn\.net\/media\//, src);
    assert.ok(buildSrcSet(src), `${src} has no srcSet: not a recognised variant file`);
  }
});

test('no map image is asked for without a Maps key: CI and the sandbox build without one', () => {
  for (const place of LISTICLE_PLACES) {
    assert.equal(staticMapUrl(place, undefined), null);
    assert.equal(staticMapUrl(place, ''), null);
  }
});

test('the static map is centred on the place, with a pin there', () => {
  const [xoma] = LISTICLE_PLACES;
  const url = new URL(staticMapUrl(xoma, 'test-key'));
  assert.equal(url.origin + url.pathname, 'https://maps.googleapis.com/maps/api/staticmap');
  assert.equal(url.searchParams.get('center'), `${xoma.latitude},${xoma.longitude}`);
  assert.equal(url.searchParams.get('markers'), `color:0x3B5BDB|${xoma.latitude},${xoma.longitude}`);
  assert.equal(url.searchParams.get('key'), 'test-key');
  assert.ok(url.searchParams.getAll('style').length > 0, 'styled to match the listicle map');
});

