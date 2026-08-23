import pg from "pg";

const { Client } = pg;
const connectionString = process.env.POSTGIS_DATABASE_URL;

if (!connectionString) throw new Error("POSTGIS_DATABASE_URL is not configured");

const source = {
  osmNodeId: "9790284747",
  name: "Koramangala 5th Block",
  latitude: 12.9348429,
  longitude: 77.6189768,
  sourceUrl: "https://www.openstreetmap.org/node/9790284747",
  sourceLicense: "OpenStreetMap contributors, ODbL 1.0",
};

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(
    `INSERT INTO property_geometry (ulpin, geometry, properties, updated_at)
     VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4::jsonb, NOW())
     ON CONFLICT (ulpin) DO UPDATE SET geometry = EXCLUDED.geometry, properties = EXCLUDED.properties, updated_at = NOW()`,
    [
      `OSM-REF-${source.osmNodeId}`,
      source.longitude,
      source.latitude,
      JSON.stringify({
        name: source.name,
        layer: "buildings",
        recordType: "verified neighbourhood location reference",
        source: "OpenStreetMap",
        sourceUrl: source.sourceUrl,
        sourceLicense: source.sourceLicense,
        exactCadastralPerimeterAvailable: false,
      }),
    ],
  );
  console.log(JSON.stringify({ imported: true, record: `OSM-REF-${source.osmNodeId}`, latitude: source.latitude, longitude: source.longitude }));
} finally {
  await client.end();
}
