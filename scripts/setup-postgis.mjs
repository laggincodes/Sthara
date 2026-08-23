import pg from "pg";

const { Client } = pg;
const connectionString = process.env.POSTGIS_DATABASE_URL;

if (!connectionString) {
  throw new Error("POSTGIS_DATABASE_URL is not configured");
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query("CREATE EXTENSION IF NOT EXISTS postgis");
  await client.query(`
    CREATE TABLE IF NOT EXISTS property_geometry (
      id SERIAL PRIMARY KEY,
      ulpin VARCHAR(96) NOT NULL UNIQUE,
      geometry geometry(Geometry, 4326) NOT NULL,
      properties JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS property_geometry_geometry_gist ON property_geometry USING GIST (geometry)");
  const versionResult = await client.query("SELECT PostGIS_Full_Version() AS postgis_version");
  const tableResult = await client.query("SELECT COUNT(*)::int AS geometry_count FROM property_geometry");
  console.log(JSON.stringify({ postgisReady: true, version: versionResult.rows[0]?.postgis_version, geometryCount: tableResult.rows[0]?.geometry_count }));
} finally {
  await client.end();
}
