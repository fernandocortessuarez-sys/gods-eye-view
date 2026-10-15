/**
 * Answer a bare city name with the most populous city of that name.
 *
 * Photon ranks an exact spelling above an accented one, so "Bogota" used to
 * fly to Bogota, New Jersey (8,000 people) instead of Bogotá, Colombia
 * (7.7 million). This provider looks the name up in a bundled GeoNames list
 * of cities with 100,000+ people, ignoring case and accents, and answers only
 * on an exact name match. Anything else ("Bogota zoo", "Paris, Texas",
 * "Museo del Oro") is passed on to the network geocoders untouched.
 *
 * `loadCities` resolves the rows written by scripts/build-world-cities.mjs:
 * [name, lat, lon, countryCode, population, asciiName?], most populous first.
 * It is called once, on the first search, so the list costs nothing at startup.
 */

/** Fold a name for comparison: case, accents, punctuation and spacing. */
export function foldCityName(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Half-width of the framing box, in degrees: larger cities get a wider view. */
export function cityHalfSpanDeg(population) {
  if (population >= 5_000_000) return 0.35;
  if (population >= 1_000_000) return 0.2;
  return 0.1;
}

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
})();

/** "CO" → "Colombia"; the code itself when the runtime has no region names. */
function countryName(code) {
  try {
    return regionNames?.of(code) || code;
  } catch {
    return code;
  }
}

/** Index the rows by folded name, keeping the first (most populous) per name. */
export function indexWorldCities(rows) {
  const byName = new Map();
  if (!Array.isArray(rows)) return byName;
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const [name, lat, lon, country, population, asciiName] = row;
    if (
      typeof name !== 'string' ||
      !Number.isFinite(lat) ||
      Math.abs(lat) > 90 ||
      !Number.isFinite(lon) ||
      Math.abs(lon) > 180 ||
      !Number.isFinite(population)
    )
      continue;
    const city = { name, lat, lon, country: String(country || ''), population };
    for (const key of [foldCityName(name), foldCityName(asciiName)]) {
      if (key && !byName.has(key)) byName.set(key, city);
    }
  }
  return byName;
}

/** Turn an indexed city into the place shape the search chain expects. */
function toPlace(city) {
  const half = cityHalfSpanDeg(city.population);
  const country = city.country ? countryName(city.country) : '';
  return {
    lat: city.lat,
    lng: city.lon,
    name: city.name,
    label: country ? `${city.name}, ${country}` : city.name,
    types: ['locality'],
    exact: true,
    viewport: {
      southwest: {
        lat: Math.max(-90, city.lat - half),
        lng: Math.max(-180, city.lon - half),
      },
      northeast: {
        lat: Math.min(90, city.lat + half),
        lng: Math.min(180, city.lon + half),
      },
    },
  };
}

/**
 * @param {object} options
 * @param {() => Promise<Array>|Array} options.loadCities Resolves the bundled rows.
 */
export function createWorldCitiesGeocoder({ loadCities } = {}) {
  if (typeof loadCities !== 'function')
    throw new TypeError('World cities require a loader');
  let index = null;
  async function load() {
    // A failed load is retried on the next search rather than cached as empty.
    index ||= Promise.resolve()
      .then(loadCities)
      .then((rows) => indexWorldCities(rows?.default ?? rows))
      .catch((error) => {
        index = null;
        throw error;
      });
    return index;
  }
  return {
    async geocode(query, { signal } = {}) {
      signal?.throwIfAborted();
      const key = foldCityName(query);
      if (!key) return { place: null, answered: true };
      let byName;
      try {
        byName = await load();
      } catch {
        // The chain treats a throw as a failed search; without the list the
        // network geocoders can still answer, so step aside, undefinitively.
        signal?.throwIfAborted();
        return { place: null, answered: false };
      }
      signal?.throwIfAborted();
      const city = byName.get(key);
      return { place: city ? toPlace(city) : null, answered: true };
    },
  };
}
