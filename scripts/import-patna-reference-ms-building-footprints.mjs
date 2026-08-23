import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import pg from "pg";

const { Client } = pg;
const targets = [
  {
    name: "IIT Patna reference area",
    latitude: 25.54275,
    longitude: 84.853,
    osmReference: "way/1368115899",
    osmUrl: "https://www.openstreetmap.org/way/1368115899",
    anchorEvidence: "OpenStreetMap named university search result; map-centre context recorded 2026-08-23",
  },
  {
    name: "AIIMS Patna reference area",
    latitude: 25.5604,
    longitude: 85.042322,
    osmReference: "way/688918175",
    osmUrl: "https://www.openstreetmap.org/way/688918175",
    anchorEvidence: "Official AIIMS Patna contact context plus OpenStreetMap named hospital search result; map-centre context recorded 2026-08-23",
  },
  {
    name: "Gandhi Maidan Patna reference area",
    latitude: 25.617305,
    longitude: 85.145065,
    osmReference: "way/133726967",
    osmUrl: "https://www.openstreetmap.org/way/133726967",
    anchorEvidence: "OpenStreetMap named landmark search result; map-centre context recorded 2026-08-23",
  },
];

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
  for (let levelIndex = level; levelIndex > 0; levelIndex -= 1) {
    const mask = 1 << (levelIndex - 1);
    key += Number((tileX & mask) !== 0) + Number((tileY & mask) !== 0) * 2;
  }
  return key;
}

function centroid(geometry) {
  const ring = geometry?.type === "Polygon" ? geometry.coordinates?.[0] : geometry?.type === "MultiPolygon" ? geometry.coordinates?.[0]?.[0] : null;
  if (!Array.isArray(ring) || ring.length < 4) return null;
  const sum = ring.reduce((acc, point) => {
    if (!Array.isArray(point) || point.length < 2 || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) return acc;
    return { lon: acc.lon + point[0], lat: acc.lat + point[1], count: acc.count + 1 };
  }, { lon: 0, lat: 0, count: 0 });
  return sum.count ? { lon: sum.lon / sum.count, lat: sum.lat / sum.count } : null;
}

function distanceMetres(aLat, aLon, bLat, bLon) {
  const radians = value => (value * Math.PI) / 180;
  const latitudeDelta = radians(bLat - aLat);
  const longitudeDelta = radians(bLon - aLon);
  const h = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function isUsablePolygon(geometry) {
  return geometry?.type === "Polygon" || geometry?.type === "MultiPolygon";
}

const indexText = await (await fetch(indexUrl, { signal: AbortSignal.timeout(60_000) })).text();
const indexRows = indexText.split("\n");
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  for (const target of targets) {
    const key = quadKey(target.latitude, target.longitude);
    const row = indexRows.find(line => line.startsWith(`India,${key},`));
    if (!row) throw new Error(`No Microsoft building-footprint tile found for India quadkey ${key}`);
    const [, , tileUrl, advertisedSize] = row.split(",");
    console.log(JSON.stringify({ stage: "streaming", target: target.name, quadkey: key, advertisedSize, selectionRadiusMetres }));

    const response = await fetch(tileUrl, { signal: AbortSignal.timeout(900_000) });
    if (!response.ok || !response.body) throw new Error(`Microsoft footprint tile request failed with ${response.status}`);

    const selected = [];
    let scanned = 0;
    const lineReader = createInterface({ input: Readable.fromWeb(response.body).pipe(createGunzip()), crlfDelay: Infinity });
    for await (const line of lineReader) {
      if (!line) continue;
      scanned += 1;
      let feature;
      try { feature = JSON.parse(line); } catch { continue; }
      if (!isUsablePolygon(feature.geometry)) continue;
      const center = centroid(feature.geometry);
      if (!center) continue;
      const distance = distanceMetres(target.latitude, target.longitude, center.lat, center.lon);
      if (distance <= selectionRadiusMetres) selected.push({ feature, distance });
    }

    selected.sort((a, b) => a.distance - b.distance);
    if (!selected.length) throw new Error(`No Microsoft building footprint was found within ${selectionRadiusMetres} metres of ${target.name}`);

    await client.query("BEGIN");
    try {
      for (const { feature, distance } of selected) {
        const geometryJson = JSON.stringify(feature.geometry);
        const geometryHash = createHash("sha256").update(geometryJson).digest("hex").slice(0, 16);
        await client.query(
          `INSERT INTO property_geometry (ulpin, geometry, properties, updated_at)
           VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3::jsonb, NOW())
           ON CONFLICT (ulpin) DO UPDATE SET geometry = EXCLUDED.geometry, properties = EXCLUDED.properties, updated_at = NOW()`,
          [
            `MS-BUILDING-${key}-${geometryHash}`,
            geometryJson,
            JSON.stringify({
              name: `${target.name} — detected building footprint`,
              layer: "buildings",
              recordType: "open ML building footprint",
              source: "Microsoft Global ML Building Footprints",
              sourceUrl: tileUrl,
              sourceLicense: "CDLA Permissive 2.0",
              sourceReferenceName: target.name,
              sourceReferenceUrl: target.osmUrl,
              sourceReferenceId: target.osmReference,
              sourceReferenceLatitude: target.latitude,
              sourceReferenceLongitude: target.longitude,
              anchorEvidence: target.anchorEvidence,
              selectionRadiusMetres,
              centroidDistanceMetres: Number(distance.toFixed(1)),
              confidence: feature.properties?.confidence ?? null,
              inferredCampusBoundary: false,
              inferredCadastralRecord: false,
              approvedHeightMetres: null,
            }),
          ],
        );
      }
      await client.query("COMMIT");
      console.log(JSON.stringify({ imported: true, target: target.name, quadkey: key, scanned, selected: selected.length, nearestMetres: Number(selected[0].distance.toFixed(1)) }));
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.end();
}
