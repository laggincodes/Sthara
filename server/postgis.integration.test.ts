import { Client } from "pg";
import { describe, expect, it } from "vitest";

describe("Neon PostGIS connection", () => {
  it("connects over SSL and verifies the PostGIS extension", async () => {
    const connectionString = process.env.POSTGIS_DATABASE_URL?.trim();
    expect(connectionString, "POSTGIS_DATABASE_URL must be configured").toMatch(/^postgres(ql)?:\/\//);

    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      const result = await client.query<{ extension: string | null }>("SELECT extversion AS extension FROM pg_extension WHERE extname = 'postgis'");
      expect(result.rows[0]?.extension, "Enable PostGIS in Neon with CREATE EXTENSION IF NOT EXISTS postgis").toBeTruthy();
    } finally {
      await client.end();
    }
  }, 20_000);
});
