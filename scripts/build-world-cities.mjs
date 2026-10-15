#!/usr/bin/env node
/**
 * Build the bundled world-cities gazetteer from a GeoNames `cities15000.txt`.
 *
 *   curl -O https://download.geonames.org/export/dump/cities15000.zip
 *   unzip cities15000.zip
 *   node scripts/build-world-cities.mjs path/to/cities15000.txt
 *
 * Writes src/data/local_data/world_cities/cities.json: one row per city with at
 * least MIN_POPULATION people, as [name, lat, lon, countryCode, population] plus
 * the ASCII spelling when it differs from the name by more than accents
 * ("Ho Chi Minh City" for "Thành Phố Hồ Chí Minh"). GeoNames' long alternate
 * name lists are left out: they hold many transliterations that would match
 * the wrong city.
 *
 * Data: GeoNames (https://www.geonames.org), CC BY 4.0.
 * @module scripts/build-world-cities
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIN_POPULATION = 100_000;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'src/data/local_data/world_cities');

/** Fold for duplicate detection: case and accents. */
const fold = (value) =>
  value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();

function main(input) {
  if (!input)
    throw new Error(
      'Usage: node scripts/build-world-cities.mjs cities15000.txt',
    );
  const rows = [];
  for (const line of readFileSync(input, 'utf8').split('\n')) {
    const f = line.split('\t');
    if (f.length < 19) continue;
    const [, name, asciiName, , lat, lon, featureClass, , country] = f;
    const population = Number(f[14]);
    if (featureClass !== 'P' || !(population >= MIN_POPULATION)) continue;
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const row = [
      name,
      Math.round(latitude * 1e4) / 1e4,
      Math.round(longitude * 1e4) / 1e4,
      country,
      population,
    ];
    if (asciiName && fold(asciiName) !== fold(name)) row.push(asciiName);
    rows.push(row);
  }
  rows.sort((a, b) => b[4] - a[4]);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, 'cities.json'), JSON.stringify(rows) + '\n');
  console.log(`${rows.length} cities with ${MIN_POPULATION}+ people written.`);
}

main(process.argv[2]);
