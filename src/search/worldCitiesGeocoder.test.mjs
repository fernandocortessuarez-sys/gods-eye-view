import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  createWorldCitiesGeocoder,
  foldCityName,
  indexWorldCities,
} from './worldCitiesGeocoder.js';
import { createPlaceSearch } from './placeSearch.js';

const bundled = JSON.parse(
  readFileSync(
    new URL('../data/local_data/world_cities/cities.json', import.meta.url),
  ),
);

test('names fold case, accents and punctuation', () => {
  assert.equal(foldCityName('  BOGOTÁ '), 'bogota');
  assert.equal(foldCityName('Medellín'), 'medellin');
  assert.equal(foldCityName('Saint-Étienne'), 'saint etienne');
});

test('an unaccented bare name reaches the most populous city of that name', async () => {
  const geocoder = createWorldCitiesGeocoder({ loadCities: () => bundled });
  const bogota = await geocoder.geocode('Bogota');
  assert.equal(bogota.place.name, 'Bogotá');
  assert.equal(bogota.place.label, 'Bogotá, Colombia');
  assert.ok(Math.abs(bogota.place.lat - 4.61) < 0.1);
  assert.equal(
    (await geocoder.geocode('munich')).place.label,
    'Munich, Germany',
  );
  assert.equal((await geocoder.geocode('Paris')).place.label, 'Paris, France');
  assert.equal((await geocoder.geocode('Medellin')).place.name, 'Medellín');
});

test('anything but an exact city name is left to the network geocoders', async () => {
  const geocoder = createWorldCitiesGeocoder({ loadCities: () => bundled });
  for (const query of ['Bogota zoo', 'Paris, Texas', 'Museo del Oro', 'Bogot'])
    assert.deepEqual(await geocoder.geocode(query), {
      place: null,
      answered: true,
    });
});

test('the list loads once, on first use, and a failed load steps aside', async () => {
  let loads = 0;
  const geocoder = createWorldCitiesGeocoder({
    loadCities: async () => {
      loads++;
      if (loads === 1) throw new Error('offline');
      return { default: [['Bogotá', 4.6, -74.08, 'CO', 7_674_366]] };
    },
  });
  assert.equal(loads, 0);
  assert.deepEqual(await geocoder.geocode('Bogota'), {
    place: null,
    answered: false,
  });
  assert.equal((await geocoder.geocode('Bogota')).place.name, 'Bogotá');
  await geocoder.geocode('Bogotá');
  assert.equal(loads, 2);
});

test('the chain stops at the city answer before asking the network', async () => {
  let networkCalls = 0;
  const search = createPlaceSearch({
    providers: [
      createWorldCitiesGeocoder({ loadCities: () => bundled }),
      {
        async geocode() {
          networkCalls++;
          return { place: { name: 'Bogota, New Jersey' }, answered: true };
        },
      },
    ],
  });
  assert.equal((await search.geocode('Bogota')).place.name, 'Bogotá');
  assert.equal(networkCalls, 0);
  await search.geocode('Bogota zoo');
  assert.equal(networkCalls, 1);
});

test('malformed rows are skipped and the larger city keeps a shared name', () => {
  const index = indexWorldCities([
    ['Córdoba', -31.41, -64.18, 'AR', 1_428_214],
    ['Córdoba', 37.89, -4.78, 'ES', 325_708],
    ['Broken', 'x', 1, 'ZZ', 1],
    null,
  ]);
  assert.equal(index.get('cordoba').country, 'AR');
  assert.equal(index.has('broken'), false);
});
