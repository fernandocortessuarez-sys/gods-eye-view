# World cities

Offline lookup for bare city names in the search box
(`src/search/worldCitiesGeocoder.js`): "Bogota" resolves to Bogotá, Colombia
(7.7 million people) rather than Bogota, New Jersey, which a network
geocoder ranked first because its spelling has no accent.

| File | Rows | Columns |
| --- | ---: | --- |
| `cities.json` | 6,283 | `[name, lat, lon, countryCode, population, asciiName?]`, most populous first |

**Source:** GeoNames `cities15000.zip` from
<https://download.geonames.org/export/dump/>, downloaded 2026-10-15, filtered
to populated places (feature class `P`) with at least 100,000 people.
Coordinates are rounded to four decimals (about 11 m). The ASCII name is kept
only when it differs from the name by more than accents. GeoNames'
alternate-name lists are not included.

**License:** Creative Commons Attribution 4.0 (CC BY 4.0),
<https://creativecommons.org/licenses/by/4.0/>. Attribution: "GeoNames —
geonames.org". Modified: filtered, rounded, and reduced to the columns above.

**Rebuild:**

```sh
curl -O https://download.geonames.org/export/dump/cities15000.zip
unzip cities15000.zip
node scripts/build-world-cities.mjs cities15000.txt
```
