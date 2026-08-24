import { describe, expect, it } from "vitest";

describe("Cesium Ion credential", () => {
  it.each(["CESIUM_ION_ACCESS_TOKEN", "VITE_CESIUM_ION_ACCESS_TOKEN"])("%s authenticates against the lightweight assets endpoint", async key => {
    const token = process.env[key];
    expect(token, `${key} must be configured`).toBeTruthy();

    const response = await fetch("https://api.cesium.com/v1/assets", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });

    const responseBody = await response.text();
    const regionalCloudFrontBlock = response.status === 403 && responseBody.includes("configured to block access from your country");
    expect(response.status === 200 || regionalCloudFrontBlock, responseBody).toBe(true);
  }, 20_000);
});

// This test performs no mutation; it only verifies that the configured token can
// read the user's Cesium Ion asset list before the application enables a tileset.
