import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import pg from "pg";

const { Client } = pg;
const sourceLat = 25.6124294;
const sourceLon = 85.0547790;
const selectionRadiusMetres = 180;
const indexUrl = "https://bfppub.blob.core.windows.net/%24web/2026-08-13/dataset-links.csv";
const connectionString = process.env.POSTGIS_DATABASE_URL;

if (!connectionString) throw new Error("POSTGIS_DATABASE_URL is not configured");

function quadKey(latitude, longitude, level = 9) {
  const sinLatitude = Math.sin((latitude * Math.PI) / 180);
  const mapSize = 256 * 2 ** level;
  const pixelX = Math.min(mapSize - 1, Math.max(0, ((longitude + 180) / 360) * mapSize));
  const pixelY = Math.min(mapSize - 1, Math.max(0, (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * mapSize));
  const tileX = Math.floor(pixelX / 256);
  const tileY = Math.floor(pixelY / 256);
  let key = "";
  for (let i = level; i > 0; i -= 1) {
    const mask = 1 << (i - 1);
    key += Number((tileX & mask) !== 0) + Number((tileY & mask) !== 0) * 2;
  }
  return key;
}

function centroid(geometry) {
  const ring = geometry?.type === "Polygon"
    ? geometry.coordinates?.[0]
    : geometry?.type === "MultiPolygon"
      ? geometry.coordinates?.[0]?.[0]
      : null;
  if (!Array.isArray(ring) || ring.length === 0) return null;
  const sum = ring.reduce((acc, point) => ({ lon: acc.lon + point[0], lat: acc.lat + point[1] }), { lon: 0, lat: 0 });
  return { lon: sum.lon / ring.length, lat: sum.lat / ring.length };
}

function distanceMeters(aLat, aLon, bLat, bLon) {
  const toRadians = value => (value * Math.PI) / 180;
  const dLat = toRadians(bLat - aLat);
  const dLon = toRadians(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const key = quadKey(sourceLat, sourceLon);
const indexText = await (await fetch(indexUrl, { signal: AbortSignal.timeout(60_000) })).text();
const row = indexText.split("\n").find(line => line.startsWith(`India,${key},`));
if (!row) throw new Error(`No Microsoft building-footprint tile found for India quadkey ${key}`);
const [, , tileUrl, advertisedSize] = row.split(",");

if (process.env.INSPECT_ONLY === "1") {
  console.log(JSON.stringify({ quadkey: key, tileUrl, advertisedSize, selectionRadiusMetres }));
  process.exit(0);
}

console.log(JSON.stringify({ stage: "streaming", quadkey: key, advertisedSize, selectionRadiusMetres }));
const response = await fetch(tileUrl, { signal: AbortSignal.timeout(900_000) });
if (!response.ok || !response.body) throw new Error(`Microsoft footprint tile request failed with ${response.status}`);

const decompressed = Readable.fromWeb(response.body).pipe(createGunzip());
const lineReader = createInterface({ input: decompressed, crlfDelay: Infinity });
const selected = [];
let scanned = 0;

for await (const line of lineReader) {
  if (!line) continue;
  scanned += 1;
  let feature;
  try {
    feature = JSON.parse(line);
  } catch {
    continue;
  }
  const center = centroid(feature.geometry);
  if (!center) continue;
  const distance = distanceMeters(sourceLat, sourceLon, center.lat, center.lon);
  if (distance <= selectionRadiusMetres) selected.push({ feature, distance });
  if (scanned % 250_000 === 0) console.log(JSON.stringify({ stage: "scanning", scanned, selected: selected.length }));
}

selected.sort((a, b) => a.distance - b.distance);
if (selected.length === 0) throw new Error(`No Microsoft-detected building footprint was found within ${selectionRadiusMetres} metres of the verified Amity University Patna location.`);

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  await client.query("BEGIN");
  for (const { feature, distance } of selected) {
    const geometryJson = JSON.stringify(feature.geometry);
    const geometryHash = createHash("sha256").update(geometryJson).digest("hex").slice(0, 16);
    const recordId = `MS-BUILDING-${key}-${geometryHash}`;
    await client.query(
      `INSERT INTO property_geometry (ulpin, geometry, properties, updated_at)
       VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3::jsonb, NOW())
       ON CONFLICT (ulpin) DO UPDATE SET geometry = EXCLUDED.geometry, properties = EXCLUDED.properties, updated_at = NOW()`,
      [
        recordId,
        geometryJson,
        JSON.stringify({
          name: "Amity University Patna vicinity — detected building footprint",
          layer: "buildings",
          recordType: "open ML building footprint",
          source: "Microsoft Global ML Building Footprints",
          sourceUrl: tileUrl,
          sourceLicense: "CDLA Permissive 2.0",
          sourceReferenceLatitude: sourceLat,
          sourceReferenceLongitude: sourceLon,
          selectionRadiusMetres,
          centroidDistanceMetres: Number(distance.toFixed(1)),
          confidence: feature.properties?.confidence ?? null,
          inferredCampusBoundary: false,
        }),
      ],
    );
  }
  await client.query("COMMIT");
  console.log(JSON.stringify({ imported: true, quadkey: key, scanned, selected: selected.length, nearestMetres: Number(selected[0].distance.toFixed(1)) }));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
