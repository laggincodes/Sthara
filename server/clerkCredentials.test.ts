import { describe, expect, it } from "vitest";

describe("Clerk server credential", () => {
  it("authenticates against the Clerk instance endpoint with the server-only secret key", async () => {
    const secretKey = process.env.CLERK_SECRET_KEY;
    const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY;
    const serverPublishableKey = process.env.CLERK_PUBLISHABLE_KEY;
    expect(secretKey, "CLERK_SECRET_KEY must be configured").toBeTruthy();
    expect(
      publishableKey,
      "VITE_CLERK_PUBLISHABLE_KEY must be configured"
    ).toMatch(/^pk_(test|live)_/);
    expect(
      serverPublishableKey,
      "CLERK_PUBLISHABLE_KEY must be configured"
    ).toBe(publishableKey);

    const response = await fetch("https://api.clerk.com/v1/instance", {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    expect(response.status, "Clerk must accept CLERK_SECRET_KEY").toBe(200);
    const instance = (await response.json()) as { id?: string };
    expect(instance.id).toMatch(/^ins_/);
  }, 20_000);
});
