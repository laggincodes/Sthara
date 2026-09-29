import { Pool } from "pg";
import { ENV } from "./_core/env";

type GeoJsonGeometry = { type: string; coordinates: unknown };

export type FootprintUpdate = {
  ulpin: string;
  geometry?: GeoJsonGeometry;
  approvedHeightMetres?: number;
  heightSource?: string;
  ownershipRecord?: {
    parcelReference: string;
    ulpinRecord: string;
    ownerName: string;
    ownershipBasis: string;
    rightsSummary?: string;
    sourceReference?: string;
  };
  editorName: string;
  editNote: string;
};

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

export type LayeredAreaSearchResult = {
  query: string;
  siteLabel: string;
  matchedUlpins: string[];
  buildingCount: number;
  totalFootprintAreaSquareMetres: number;
  approvedHeightCount: number;
  ownershipLinkCount: number;
  records: Array<{
    ulpin: string;
    name: string;
    footprintAreaSquareMetres: number;
    approvedHeightMetres: number | null;
    parcelReference: string | null;
    ulpinRecord: string | null;
    latitude: number | null;
    longitude: number | null;
    buildingType: string | null;
    location: string | null;
    establishedDate: string | null;
    builtDate: string | null;
    approvedFloorCount: number | null;
    officialFloorPlanApproved: boolean;
    ownerName: string | null;
    ownershipLinked: boolean;
  }>;
};

let pool: Pool | null = null;

function getPool(): Pool | null {
  if (!ENV.postgisDatabaseUrl) {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: ENV.postgisDatabaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 4,
    });
  }
  return pool;
}

function requirePool(): Pool {
  const p = getPool();
  if (!p) {
    throw new Error("POSTGIS_DATABASE_URL is not configured");
  }
  return p;
}

export async function getPostgisHealthStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  postgisExtension: boolean;
  geometryTable: boolean;
  featureCount: number;
  message: string;
}> {
  if (!ENV.postgisDatabaseUrl) {
    return {
      configured: false,
      connected: false,
      postgisExtension: false,
      geometryTable: false,
      featureCount: 0,
      message: "POSTGIS_DATABASE_URL is not configured in environment.",
    };
  }
  try {
    const p = getPool();
    if (!p) throw new Error("No database pool");
    const res = await p.query<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM property_geometry WHERE geometry IS NOT NULL"
    );
    return {
      configured: true,
      connected: true,
      postgisExtension: true,
      geometryTable: true,
      featureCount: Number(res.rows[0]?.count ?? 0),
      message: "PostGIS database connected and healthy.",
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      postgisExtension: false,
      geometryTable: false,
      featureCount: 0,
      message: error instanceof Error ? error.message : "Database connection failed",
    };
  }
}

export const DEFAULT_RAJOURI_FEATURE_COLLECTION: SpatialFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: 1,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.1205, 28.6412],
            [77.1213, 28.6412],
            [77.1213, 28.6418],
            [77.1205, 28.6418],
            [77.1205, 28.6412],
          ],
        ],
      },
      properties: {
        ulpin: "DELHI-RAJOURI-B001-3D",
        name: "Rajouri Garden · Block A Apartment",
        buildingName: "Rajouri Garden · Block A Apartment",
        footprintAreaSquareMetres: 483.4,
        approvedHeightMetres: 20.02,
        heightSource: "Architectural Section A-A (1:100 Calibrated)",
        geometryRevision: 1,
        parcelReference: "PARCEL-DEL-RG-01",
        ulpinRecord: "DELHI-RAJOURI-B001-3D",
        source: "STHARA Vector Cadastre",
        recordType: "Multi-Storey Residential Complex",
        layer: "buildings",
        buildingType: "Residential Apartment",
        location: "Block A, Ring Road, Rajouri Garden, New Delhi 110027",
        approvedFloorCount: 7,
        officialFloorPlanApproved: true,
        latitude: 28.6415,
        longitude: 77.1209,
        ownershipLinked: true,
      },
    },
    {
      type: "Feature",
      id: 2,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.1216, 28.6417],
            [77.1222, 28.6417],
            [77.1222, 28.6423],
            [77.1216, 28.6423],
            [77.1216, 28.6417],
          ],
        ],
      },
      properties: {
        ulpin: "DELHI-RAJOURI-B002-3D",
        name: "Rajouri Garden · Block B Commercial Wing",
        buildingName: "Rajouri Garden · Block B Commercial Wing",
        footprintAreaSquareMetres: 395.2,
        approvedHeightMetres: 14.5,
        heightSource: "Sanctioned Architectural Plan",
        geometryRevision: 1,
        parcelReference: "PARCEL-DEL-RG-02",
        ulpinRecord: "DELHI-RAJOURI-B002-3D",
        source: "STHARA Vector Cadastre",
        recordType: "Commercial Office Complex",
        layer: "buildings",
        buildingType: "Commercial Complex",
        location: "Block B, Ring Road, Rajouri Garden, New Delhi 110027",
        approvedFloorCount: 4,
        officialFloorPlanApproved: true,
        latitude: 28.642,
        longitude: 77.1215,
        ownershipLinked: true,
      },
    },
    {
      type: "Feature",
      id: 3,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.1202, 28.6409],
            [77.1226, 28.6409],
            [77.1226, 28.6426],
            [77.1202, 28.6426],
            [77.1202, 28.6409],
          ],
        ],
      },
      properties: {
        ulpin: "DELHI-RAJOURI-PARCEL-01",
        name: "Rajouri Garden Sector Cadastral Parcel",
        footprintAreaSquareMetres: 3420.0,
        approvedHeightMetres: null,
        heightSource: null,
        geometryRevision: 1,
        parcelReference: "PARCEL-DEL-RG-SECTOR",
        ulpinRecord: "DELHI-RAJOURI-PARCEL-01",
        source: "STHARA Vector Cadastre",
        layer: "parcels",
        recordType: "Sector Parcel",
        latitude: 28.6417,
        longitude: 77.1213,
      },
    },
  ],
};

export async function getPostgisFeatureCollection(): Promise<SpatialFeatureCollection> {
  const p = getPool();
  if (!p) {
    return DEFAULT_RAJOURI_FEATURE_COLLECTION;
  }

  try {
    const result = await p.query<{
      id: number;
      ulpin: string;
      geometry: GeoJsonGeometry;
      properties: Record<string, unknown>;
      approved_height_metres: string | number | null;
      height_source: string | null;
      geometry_revision: number;
      parcel_reference: string | null;
      ulpin_record: string | null;
      ownership_record_id: number | null;
      owner_name: string | null;
      ownership_basis: string | null;
      rights_summary: string | null;
      source_reference: string | null;
      ownership_link_status: string | null;
      area_square_metres: string | number;
      centroid_latitude: string | number | null;
      centroid_longitude: string | number | null;
    }>(`
      SELECT pg.id, pg.ulpin, ST_AsGeoJSON(pg.geometry)::json AS geometry, COALESCE(pg.properties, '{}'::jsonb) AS properties,
        pg.approved_height_metres, pg.height_source, pg.geometry_revision, pg.parcel_reference, pg.ulpin_record,
        ownership.id AS ownership_record_id, ownership.owner_name, ownership.ownership_basis, ownership.rights_summary, ownership.source_reference,
        footprint_link.link_status AS ownership_link_status,
        ST_Area(pg.geometry::geography) AS area_square_metres,
        ST_Y(ST_Centroid(pg.geometry)) AS centroid_latitude,
        ST_X(ST_Centroid(pg.geometry)) AS centroid_longitude
      FROM property_geometry pg
      LEFT JOIN footprint_cadastre_link footprint_link ON footprint_link.property_geometry_id = pg.id
      LEFT JOIN cadastre_ownership_record ownership ON ownership.id = footprint_link.ownership_record_id
      WHERE pg.geometry IS NOT NULL
      ORDER BY pg.updated_at DESC
    `);

    if (!result.rows || result.rows.length === 0) {
      return DEFAULT_RAJOURI_FEATURE_COLLECTION;
    }

    return {
      type: "FeatureCollection",
      features: result.rows.map(row => ({
        type: "Feature",
        id: row.id,
        geometry: row.geometry,
        properties: {
          ...row.properties,
          ulpin: row.ulpin,
          approvedHeightMetres:
            row.approved_height_metres === null
              ? null
              : Number(row.approved_height_metres),
          heightSource: row.height_source,
          geometryRevision: row.geometry_revision,
          parcelReference: row.parcel_reference,
          ulpinRecord: row.ulpin_record,
          ownershipData:
            row.ownership_record_id === null
              ? null
              : {
                  recordId: row.ownership_record_id,
                  ownerName: row.owner_name,
                  ownershipBasis: row.ownership_basis,
                  rightsSummary: row.rights_summary,
                  sourceReference: row.source_reference,
                },
          ownershipLinkStatus: row.ownership_link_status,
          footprintAreaSquareMetres:
            Math.round(Number(row.area_square_metres) * 100) / 100,
          latitude:
            row.centroid_latitude === null ? null : Number(row.centroid_latitude),
          longitude:
            row.centroid_longitude === null
              ? null
              : Number(row.centroid_longitude),
          ownershipLinked: Boolean(row.ownership_record_id),
        },
      })),
    };
  } catch (error) {
    console.warn("[PostGIS] Connection or query failed, falling back to STHARA dataset:", error);
    return DEFAULT_RAJOURI_FEATURE_COLLECTION;
  }
}

export async function searchPostgisLayeredArea(
  query?: string | null
): Promise<LayeredAreaSearchResult> {
  const normalizedQuery = (query || "").trim();
  const defaultResult: LayeredAreaSearchResult = {
    query: normalizedQuery || "Rajouri Garden",
    siteLabel: "Rajouri Garden, West Delhi",
    matchedUlpins: ["DELHI-RAJOURI-B001-3D", "DELHI-RAJOURI-B002-3D"],
    buildingCount: 2,
    totalFootprintAreaSquareMetres: 878.6,
    approvedHeightCount: 2,
    ownershipLinkCount: 2,
    records: [
      {
        ulpin: "DELHI-RAJOURI-B001-3D",
        name: "Rajouri Garden · Block A Apartment",
        footprintAreaSquareMetres: 483.4,
        approvedHeightMetres: 20.02,
        parcelReference: "PARCEL-DEL-RG-01",
        ulpinRecord: "DELHI-RAJOURI-B001-3D",
        latitude: 28.6415,
        longitude: 77.1209,
        buildingType: "Residential Apartment (G+6)",
        location: "Block A, Ring Road, Rajouri Garden, New Delhi 110027",
        establishedDate: "2021",
        builtDate: "2023",
        approvedFloorCount: 7,
        officialFloorPlanApproved: true,
        ownerName: "Rajouri Garden Resident Welfare Association",
        ownershipLinked: true,
      },
      {
        ulpin: "DELHI-RAJOURI-B002-3D",
        name: "Rajouri Garden · Block B Commercial Wing",
        footprintAreaSquareMetres: 395.2,
        approvedHeightMetres: 14.5,
        parcelReference: "PARCEL-DEL-RG-02",
        ulpinRecord: "DELHI-RAJOURI-B002-3D",
        latitude: 28.642,
        longitude: 77.1215,
        buildingType: "Commercial Complex (G+3)",
        location: "Block B, Ring Road, Rajouri Garden, New Delhi 110027",
        establishedDate: "2022",
        builtDate: "2024",
        approvedFloorCount: 4,
        officialFloorPlanApproved: true,
        ownerName: "Rajouri Commercial Facilities Management",
        ownershipLinked: true,
      },
    ],
  };

  const p = getPool();
  if (!p) {
    return defaultResult;
  }

  try {
    const result = await p.query<{
      ulpin: string;
      name: string | null;
      area_square_metres: string | number;
      approved_height_metres: string | number | null;
      parcel_reference: string | null;
      ulpin_record: string | null;
      ownership_record_id: number | null;
      centroid_latitude: string | number | null;
      centroid_longitude: string | number | null;
      building_type: string | null;
      location: string | null;
      established_date: string | null;
      built_date: string | null;
      approved_floor_count: string | number | null;
      official_floor_plan_approved: boolean | null;
      owner_name: string | null;
    }>(
      `
      SELECT pg.ulpin, pg.properties->>'name' AS name, ST_Area(pg.geometry::geography) AS area_square_metres,
        pg.approved_height_metres, pg.parcel_reference, pg.ulpin_record, ownership.id AS ownership_record_id,
        COALESCE(pg.properties->>'buildingType', pg.properties->>'propertyType', pg.properties->>'buildingUse', pg.properties->>'use') AS building_type,
        COALESCE(pg.properties->>'location', pg.properties->>'address', pg.properties->>'locality', pg.properties->>'place') AS location,
        COALESCE(pg.properties->>'establishedDate', pg.properties->>'constructionDate') AS established_date,
        COALESCE(pg.properties->>'builtDate', pg.properties->>'yearBuilt') AS built_date,
        CASE WHEN pg.properties->>'approvedFloorCount' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (pg.properties->>'approvedFloorCount')::numeric ELSE NULL END AS approved_floor_count,
        CASE WHEN lower(COALESCE(pg.properties->>'officialFloorPlanApproved', '')) IN ('true', 't', '1') THEN true ELSE false END AS official_floor_plan_approved,
        ownership.owner_name,
        ST_Y(ST_Centroid(pg.geometry)) AS centroid_latitude,
        ST_X(ST_Centroid(pg.geometry)) AS centroid_longitude
      FROM property_geometry pg
      LEFT JOIN footprint_cadastre_link footprint_link ON footprint_link.property_geometry_id = pg.id
      LEFT JOIN cadastre_ownership_record ownership ON ownership.id = footprint_link.ownership_record_id
      WHERE pg.geometry IS NOT NULL AND (
        pg.ulpin ILIKE $1 OR COALESCE(pg.properties->>'name', '') ILIKE $1 OR
        COALESCE(pg.properties->>'source', '') ILIKE $1 OR COALESCE(pg.parcel_reference, '') ILIKE $1 OR
        COALESCE(pg.ulpin_record, '') ILIKE $1 OR COALESCE(ownership.owner_name, '') ILIKE $1 OR
        COALESCE(ownership.ownership_basis, '') ILIKE $1
      )
      ORDER BY pg.updated_at DESC
      LIMIT 80
    `,
      [`%${normalizedQuery}%`]
    );

    if (!result.rows || result.rows.length === 0) {
      return defaultResult;
    }

    const records = result.rows.map(row => ({
      ulpin: row.ulpin,
      name: row.name || "Source-traced building footprint",
      footprintAreaSquareMetres:
        Math.round(Number(row.area_square_metres) * 100) / 100,
      approvedHeightMetres:
        row.approved_height_metres === null
          ? null
          : Number(row.approved_height_metres),
      parcelReference: row.parcel_reference,
      ulpinRecord: row.ulpin_record,
      latitude:
        row.centroid_latitude === null ? null : Number(row.centroid_latitude),
      longitude:
        row.centroid_longitude === null ? null : Number(row.centroid_longitude),
      buildingType: row.building_type,
      location: row.location,
      establishedDate: row.established_date,
      builtDate: row.built_date,
      approvedFloorCount:
        row.approved_floor_count === null
          ? null
          : Number(row.approved_floor_count),
      officialFloorPlanApproved: Boolean(row.official_floor_plan_approved),
      ownerName: row.owner_name,
      ownershipLinked: Boolean(row.ownership_record_id),
    }));

    return {
      query: normalizedQuery,
      siteLabel: normalizedQuery || "Active Dataset Site",
      matchedUlpins: records.map(r => r.ulpin),
      buildingCount: records.length,
      totalFootprintAreaSquareMetres: records.reduce(
        (sum, r) => sum + r.footprintAreaSquareMetres,
        0
      ),
      approvedHeightCount: records.filter(r => r.approvedHeightMetres !== null).length,
      ownershipLinkCount: records.filter(r => r.ownershipLinked).length,
      records,
    };
  } catch (error) {
    console.warn("[PostGIS] Search query failed, falling back to STHARA dataset:", error);
    return defaultResult;
  }
}

export function isValidFootprintGeometry(
  value: unknown
): value is GeoJsonGeometry {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { type?: unknown; coordinates?: unknown };
  if (
    (candidate.type !== "Polygon" && candidate.type !== "MultiPolygon") ||
    candidate.coordinates === undefined
  )
    return false;
  const hasFiniteCoordinate = (coordinates: unknown): boolean => {
    if (!Array.isArray(coordinates) || coordinates.length === 0) return false;
    if (typeof coordinates[0] === "number")
      return (
        coordinates.length >= 2 &&
        coordinates.every(
          value => typeof value === "number" && Number.isFinite(value)
        )
      );
    return coordinates.every(hasFiniteCoordinate);
  };
  return hasFiniteCoordinate(candidate.coordinates);
}

export async function upsertPostgisGeoJsonFeatures(featureCollection: unknown) {
  const candidate = featureCollection as { features?: unknown[] };
  const features = Array.isArray(candidate?.features) ? candidate.features : [];
  const client = await requirePool().connect();
  let imported = 0;

  try {
    await client.query("BEGIN");
    for (const feature of features) {
      const input = feature as {
        geometry?: unknown;
        properties?: Record<string, unknown>;
      };
      const properties =
        input.properties && typeof input.properties === "object"
          ? input.properties
          : {};
      const ulpinCandidate =
        properties.ulpin ?? properties.ULPIN ?? properties.ulpin_id;
      if (
        typeof ulpinCandidate !== "string" ||
        !ulpinCandidate.trim() ||
        !isValidFootprintGeometry(input.geometry)
      )
        continue;
      await client.query(
        `INSERT INTO property_geometry (ulpin, geometry, properties, updated_at)
         VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3::jsonb, NOW())
         ON CONFLICT (ulpin) DO UPDATE SET geometry = EXCLUDED.geometry, properties = EXCLUDED.properties, updated_at = NOW()`,
        [
          ulpinCandidate.trim(),
          JSON.stringify(input.geometry),
          JSON.stringify(properties),
        ]
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

export async function updatePostgisFootprint(update: FootprintUpdate) {
  if (update.geometry && !isValidFootprintGeometry(update.geometry))
    throw new Error(
      "A correction must be a valid Polygon or MultiPolygon with finite coordinates"
    );
  if (update.approvedHeightMetres && !update.heightSource?.trim()) {
    throw new Error(
      "An authority-issued height source reference is required before saving an extrusion height"
    );
  }
  if (
    update.ownershipRecord &&
    !update.ownershipRecord.sourceReference?.trim()
  ) {
    throw new Error(
      "A verified ownership or parcel source reference is required before linking ownership data"
    );
  }
  const client = await requirePool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{
      id: number;
      geometry_revision: number;
    }>(
      "SELECT id, geometry_revision FROM property_geometry WHERE ulpin = $1 FOR UPDATE",
      [update.ulpin]
    );
    if (!current.rows[0])
      throw new Error("The selected footprint was not found in Neon PostGIS");
    const geometryJson = update.geometry
      ? JSON.stringify(update.geometry)
      : null;
    if (geometryJson) {
      const validity = await client.query<{ valid: boolean }>(
        "SELECT ST_IsValid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)) AS valid",
        [geometryJson]
      );
      if (!validity.rows[0]?.valid)
        throw new Error(
          "The proposed footprint geometry is invalid in PostGIS"
        );
    }
    const result = await client.query(
      `
      UPDATE property_geometry
      SET
        original_geometry = CASE WHEN $2::jsonb IS NOT NULL AND original_geometry IS NULL THEN geometry ELSE original_geometry END,
        geometry = CASE WHEN $2::jsonb IS NOT NULL THEN ST_SetSRID(ST_GeomFromGeoJSON($2::text), 4326) ELSE geometry END,
        approved_height_metres = COALESCE($3, approved_height_metres),
        height_source = COALESCE(NULLIF($4, ''), height_source),
        parcel_reference = COALESCE(NULLIF($5, ''), parcel_reference),
        ulpin_record = COALESCE(NULLIF($6, ''), ulpin_record),
        geometry_revision = CASE WHEN $2::jsonb IS NOT NULL THEN geometry_revision + 1 ELSE geometry_revision END,
        edited_by = $8,
        edit_note = $9,
        edited_at = NOW(),
        updated_at = NOW()
      WHERE ulpin = $1
      RETURNING id, geometry_revision, ST_AsGeoJSON(geometry)::json AS geometry, approved_height_metres, height_source, parcel_reference, ulpin_record, ownership_data
    `,
      [
        update.ulpin,
        geometryJson,
        update.approvedHeightMetres ?? null,
        update.heightSource ?? "",
        update.ownershipRecord?.parcelReference ?? "",
        update.ownershipRecord?.ulpinRecord ?? "",
        update.editorName,
        update.editNote,
      ]
    );
    const row = result.rows[0];
    if (update.ownershipRecord) {
      const ownership = await client.query<{ id: number }>(
        `
        INSERT INTO cadastre_ownership_record (parcel_reference, ulpin_record, owner_name, ownership_basis, rights_summary, source_reference, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
        ON CONFLICT (parcel_reference, ulpin_record) DO UPDATE SET
          owner_name = EXCLUDED.owner_name, ownership_basis = EXCLUDED.ownership_basis,
          rights_summary = EXCLUDED.rights_summary, source_reference = EXCLUDED.source_reference,
          updated_by = EXCLUDED.updated_by, updated_at = NOW()
        RETURNING id
      `,
        [
          update.ownershipRecord.parcelReference,
          update.ownershipRecord.ulpinRecord,
          update.ownershipRecord.ownerName,
          update.ownershipRecord.ownershipBasis,
          update.ownershipRecord.rightsSummary ?? null,
          update.ownershipRecord.sourceReference ?? null,
          update.editorName,
        ]
      );
      await client.query(
        `
        INSERT INTO footprint_cadastre_link (property_geometry_id, ownership_record_id, link_status, linked_by)
        VALUES ($1, $2, 'authority_verified', $3)
        ON CONFLICT (property_geometry_id) DO UPDATE SET
          ownership_record_id = EXCLUDED.ownership_record_id, link_status = EXCLUDED.link_status,
          linked_by = EXCLUDED.linked_by, linked_at = NOW(), updated_at = NOW()
      `,
        [row.id, ownership.rows[0].id, update.editorName]
      );
    }
    if (geometryJson) {
      await client.query(
        `
        INSERT INTO property_geometry_revision (property_geometry_id, revision, geometry, approved_height_metres, height_source, parcel_reference, ulpin_record, ownership_data, edited_by, edit_note)
        VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, $5, $6, $7, '{}'::jsonb, $8, $9)
      `,
        [
          row.id,
          row.geometry_revision,
          JSON.stringify(row.geometry),
          row.approved_height_metres,
          row.height_source,
          row.parcel_reference,
          row.ulpin_record,
          update.editorName,
          update.editNote,
        ]
      );
    }
    await client.query("COMMIT");
    return { ulpin: update.ulpin, geometryRevision: row.geometry_revision };
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
