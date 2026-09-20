// One-off/maintenance generator for src/lib/data/ph-locations.json — the
// full Philippine region -> province -> city/municipality hierarchy used by
// the app's location pickers (AreaPicker, pickup locations, local delivery
// areas, multi-location branches, Looking For post areas).
//
// Source: the PSGC (Philippine Standard Geographic Code) static JSON API at
// https://psgc.gitlab.io/api, itself parsed from the PSA's quarterly PSGC
// publication. Re-run this whenever that data needs refreshing — it fetches
// live, so there's nothing else to update by hand.
//
// Usage: node scripts/generate-ph-locations.js

const fs = require("fs");
const path = require("path");

const OUT_FILE = path.join(__dirname, "..", "src", "lib", "data", "ph-locations.json");
const NCR_REGION_CODE = "130000000";
const ABBREV_REGIONS = new Set(["NCR", "CAR", "BARMM"]);

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

function cleanCityName(name) {
  if (name.startsWith("City of ")) {
    const base = name.slice("City of ".length);
    return base.endsWith("City") ? base : `${base} City`;
  }
  return name;
}

function cleanRegionName(r) {
  return ABBREV_REGIONS.has(r.name) ? r.regionName : r.name;
}

async function main() {
  const [regions, provinces, cities] = await Promise.all([
    fetchJson("https://psgc.gitlab.io/api/regions.json"),
    fetchJson("https://psgc.gitlab.io/api/provinces.json"),
    fetchJson("https://psgc.gitlab.io/api/cities-municipalities.json"),
  ]);

  const provinceByCode = new Map();
  for (const p of provinces) {
    provinceByCode.set(p.code, { code: p.code, name: p.name, regionCode: p.regionCode, cities: [] });
  }

  // NCR has no real provinces (provinceCode: false) — its cities get one
  // synthetic "Metro Manila" bucket rather than exposing legislative
  // districts nobody addresses mail by.
  const ncrBucket = { code: "NCR", name: "Metro Manila", cities: [] };

  // Standalone highly-urbanized cities outside NCR (e.g. Cotabato City,
  // Isabela City) also carry provinceCode:false — they get their own
  // single-city pseudo-province within their region.
  const independentByRegion = new Map();

  for (const c of cities) {
    const displayName = cleanCityName(c.name);
    if (c.provinceCode && provinceByCode.has(c.provinceCode)) {
      provinceByCode.get(c.provinceCode).cities.push({ code: c.code, name: displayName });
    } else if (c.regionCode === NCR_REGION_CODE) {
      ncrBucket.cities.push({ code: c.code, name: displayName });
    } else {
      if (!independentByRegion.has(c.regionCode)) independentByRegion.set(c.regionCode, []);
      independentByRegion.get(c.regionCode).push({ code: c.code, name: displayName });
    }
  }

  const regionByCode = new Map();
  for (const r of regions) {
    regionByCode.set(r.code, { code: r.code, name: cleanRegionName(r), provinces: [] });
  }

  for (const p of provinceByCode.values()) {
    p.cities.sort((a, b) => a.name.localeCompare(b.name));
    const region = regionByCode.get(p.regionCode);
    if (region) region.provinces.push({ code: p.code, name: p.name, cities: p.cities });
  }

  ncrBucket.cities.sort((a, b) => a.name.localeCompare(b.name));
  // "Metro Manila" also doubles as a selectable catch-all city-level area —
  // real PH addressing commonly uses it when a buyer/seller doesn't want to
  // commit to one specific NCR city.
  ncrBucket.cities.unshift({ code: "METRO-MANILA-ALL", name: "Metro Manila" });
  regionByCode.get(NCR_REGION_CODE).provinces.push(ncrBucket);

  for (const [regionCode, entries] of independentByRegion) {
    const region = regionByCode.get(regionCode);
    for (const e of entries) {
      region.provinces.push({ code: e.code, name: e.name, cities: [{ code: e.code, name: e.name }] });
    }
  }

  const result = [...regionByCode.values()]
    .map((r) => ({ ...r, provinces: r.provinces.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  let totalCities = 0;
  let totalProvinces = 0;
  for (const r of result) {
    totalProvinces += r.provinces.length;
    for (const p of r.provinces) totalCities += p.cities.length;
  }
  console.log(`regions: ${result.length}, provinces/districts: ${totalProvinces}, cities: ${totalCities}`);

  fs.writeFileSync(OUT_FILE, JSON.stringify(result));
  console.log(`wrote ${OUT_FILE} (${fs.statSync(OUT_FILE).size} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
