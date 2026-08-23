import pg from "pg";

const { Client } = pg;
const connectionString = process.env.POSTGIS_DATABASE_URL;

if (!connectionString) throw new Error("POSTGIS_DATABASE_URL is not configured");

const source = {
  osmNodeId: "12597547717",
  name: "Amity University Patna",
  latitude: 25.6124294,
  longitude: 85.0547790,
  sourceUrl: "https://www.openstreetmap.org/node/12597547717",
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
        recordType: "verified campus location reference",
        source: "OpenStreetMap",
        sourceUrl: source.sourceUrl,
        sourceLicense: source.sourceLicense,
        exactCampusPerimeterAvailable: false,
      }),
    ],
  );
  console.log(JSON.stringify({ imported: true, record: `OSM-REF-${source.osmNodeId}`, latitude: source.latitude, longitude: source.longitude }));
} finally {
  await client.end();
}
