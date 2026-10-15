import { loadBundledJson } from './bundledJson.js';

/** The bundled GeoNames city list the search box reads on its first search. */
export function loadWorldCities() {
  return loadBundledJson(
    new URL('./local_data/world_cities/cities.json', import.meta.url),
  );
}
