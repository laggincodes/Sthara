import { describe, expect, it } from "vitest";

describe("PostGIS geometry service configuration", () => {
  it("accepts a server-side authenticated reachability check", async () => {
    const baseUrl = process.env.POSTGIS_API_BASE_URL?.trim();
    const apiKey = process.env.POSTGIS_API_KEY?.trim();

    expect(baseUrl, "POSTGIS_API_BASE_URL must be configured with an HTTPS geometry API URL").toMatch(/^https:\/\//);

    const response = await fetch(baseUrl!, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.status, "The PostGIS endpoint rejected the configured credential").not.toBe(401);
    expect(response.status, "The PostGIS endpoint rejected the configured credential").not.toBe(403);
  }, 15_000);
});
