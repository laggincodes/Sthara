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
  await client.query("ALTER TABLE property_geometry ADD COLUMN IF NOT EXISTS original_geometry geometry(Geometry, 4326)");
  await client.query("ALTER TABLE property_geometry ADD COLUMN IF NOT EXISTS approved_height_metres NUMERIC(8,2)");
  await client.query("ALTER TABLE property_geometry ADD COLUMN IF NOT EXISTS height_source VARCHAR(240)");
  await client.query("ALTER TABLE property_geometry ADD COLUMN IF NOT EXISTS geometry_revision INTEGER NOT NULL DEFAULT 1");
  await client.query("ALTER TABLE property_geometry ADD COLUMN IF NOT EXISTS parcel_reference VARCHAR(128)");
  await client.query("ALTER TABLE property_geometry ADD COLUMN IF NOT EXISTS ulpin_record VARCHAR(128)");
  await client.query("ALTER TABLE property_geometry ADD COLUMN IF NOT EXISTS ownership_data JSONB NOT NULL DEFAULT '{}'::jsonb");
  await client.query("ALTER TABLE property_geometry ADD COLUMN IF NOT EXISTS edited_by VARCHAR(160)");
  await client.query("ALTER TABLE property_geometry ADD COLUMN IF NOT EXISTS edit_note TEXT");
  await client.query("ALTER TABLE property_geometry ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP");
  await client.query(`
    CREATE TABLE IF NOT EXISTS property_geometry_revision (
      id SERIAL PRIMARY KEY,
      property_geometry_id INTEGER NOT NULL REFERENCES property_geometry(id) ON DELETE CASCADE,
      revision INTEGER NOT NULL,
      geometry geometry(Geometry, 4326) NOT NULL,
      approved_height_metres NUMERIC(8,2),
      height_source VARCHAR(240),
      parcel_reference VARCHAR(128),
      ulpin_record VARCHAR(128),
      ownership_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      edited_by VARCHAR(160) NOT NULL,
      edit_note TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS cadastre_ownership_record (
      id SERIAL PRIMARY KEY,
      parcel_reference VARCHAR(128) NOT NULL,
      ulpin_record VARCHAR(128) NOT NULL,
      owner_name TEXT NOT NULL,
      ownership_basis TEXT NOT NULL,
      rights_summary TEXT,
      source_reference TEXT,
      created_by VARCHAR(160) NOT NULL,
      updated_by VARCHAR(160) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(parcel_reference, ulpin_record)
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS footprint_cadastre_link (
      property_geometry_id INTEGER PRIMARY KEY REFERENCES property_geometry(id) ON DELETE CASCADE,
      ownership_record_id INTEGER NOT NULL REFERENCES cadastre_ownership_record(id) ON DELETE RESTRICT,
      link_status VARCHAR(32) NOT NULL DEFAULT 'authority_verified',
      linked_by VARCHAR(160) NOT NULL,
      linked_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS property_geometry_geometry_gist ON property_geometry USING GIST (geometry)");
  await client.query("CREATE INDEX IF NOT EXISTS footprint_cadastre_link_ownership_idx ON footprint_cadastre_link (ownership_record_id)");
  const versionResult = await client.query("SELECT PostGIS_Full_Version() AS postgis_version");
  const tableResult = await client.query("SELECT COUNT(*)::int AS geometry_count FROM property_geometry");
  console.log(JSON.stringify({ postgisReady: true, version: versionResult.rows[0]?.postgis_version, geometryCount: tableResult.rows[0]?.geometry_count }));
} finally {
  await client.end();
}
