import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

const validUpdate = {
  ulpin: "MS-BUILDING-TEST",
  approvedHeightMetres: 12,
  heightSource: "Approved survey reference",
  editNote: "Authority-reviewed height and geometry update.",
};

describe("protected footprint approval workflow", () => {
  it("rejects unauthenticated footprint approvals before any PostGIS mutation", async () => {
    const caller = appRouter.createCaller({ req: {} as never, res: {} as never, user: null });
    await expect(caller.postgis.updateFootprint(validUpdate)).rejects.toThrow("required permission");
  });

  it("rejects non-administrator footprint approvals before any PostGIS mutation", async () => {
    const caller = appRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: { id: 1, openId: "field-user", name: "Field user", email: null, loginMethod: null, role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    });
    await expect(caller.postgis.updateFootprint(validUpdate)).rejects.toThrow("required permission");
  });
});
