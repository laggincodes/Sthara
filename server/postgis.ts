import { Pool } from "pg";
import { ENV } from "./_core/env";

type GeoJsonGeometry = { type: string; coordinates: unknown };

export type SpatialFeature = {
  type: "Feature";
  id: string | number;
  geometry: GeoJsonGeometry;
  properties: Record<string, unknown> & { ulpin: string };
};

export type SpatialFeatureCollection = {
  type: "FeatureCollection";
  features: SpatialFeature[];
};

let pool: Pool | null = null;

function getPool() {
  if (!ENV.postgisDatabaseUrl) {
    throw new Error("POSTGIS_DATABASE_URL is not configured");
  }
  if (!pool) {
    pool = new Pool({ connectionString: ENV.postgisDatabaseUrl, ssl: { rejectUnauthorized: false }, max: 4 });
  }
  return pool;
}

export async function getPostgisFeatureCollection(): Promise<SpatialFeatureCollection> {
  const result = await getPool().query<{
    id: number;
    ulpin: string;
    geometry: GeoJsonGeometry;
    properties: Record<string, unknown>;
  }>(`
    SELECT id, ulpin, ST_AsGeoJSON(geometry)::json AS geometry, COALESCE(properties, '{}'::jsonb) AS properties
    FROM property_geometry
    WHERE geometry IS NOT NULL
    ORDER BY updated_at DESC
  `);

  return {
    type: "FeatureCollection",
    features: result.rows.map(row => ({
      type: "Feature",
      id: row.id,
      geometry: row.geometry,
      properties: { ...row.properties, ulpin: row.ulpin },
    })),
  };
}

function isValidGeometry(value: unknown): value is GeoJsonGeometry {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { type?: unknown; coordinates?: unknown };
  return typeof candidate.type === "string" && candidate.coordinates !== undefined;
}

export async function upsertPostgisGeoJsonFeatures(featureCollection: unknown) {
  const candidate = featureCollection as { features?: unknown[] };
  const features = Array.isArray(candidate?.features) ? candidate.features : [];
  const client = await getPool().connect();
  let imported = 0;

  try {
    await client.query("BEGIN");
    for (const feature of features) {
      const input = feature as { geometry?: unknown; properties?: Record<string, unknown> };
      const properties = input.properties && typeof input.properties === "object" ? input.properties : {};
      const ulpinCandidate = properties.ulpin ?? properties.ULPIN ?? properties.ulpin_id;
      if (typeof ulpinCandidate !== "string" || !ulpinCandidate.trim() || !isValidGeometry(input.geometry)) continue;
      await client.query(
        `INSERT INTO property_geometry (ulpin, geometry, properties, updated_at)
         VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3::jsonb, NOW())
         ON CONFLICT (ulpin) DO UPDATE SET geometry = EXCLUDED.geometry, properties = EXCLUDED.properties, updated_at = NOW()`,
        [ulpinCandidate.trim(), JSON.stringify(input.geometry), JSON.stringify(properties)],
      );
      imported += 1;
    }
    await client.query("COMMIT");
    return { imported, skipped: features.length - imported };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function hasValidPostgisApiKey(authorizationHeader?: string) {
  const expected = ENV.postgisApiKey;
  if (!expected) return false;
  const token = authorizationHeader?.replace(/^Bearer\s+/i, "").trim();
  return token === expected;
}
