import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const postgisSource = readFileSync(new URL("./postgis.ts", import.meta.url), "utf8");
const homeSource = readFileSync(
  new URL("../client/src/pages/Home.tsx", import.meta.url),
  "utf8"
);

const validUpdate = {
  ulpin: "MS-BUILDING-TEST",
  approvedHeightMetres: 12,
  heightSource: "Approved survey reference",
  editNote: "Authority-reviewed height and geometry update.",
};

describe("protected footprint approval workflow", () => {
  it("rejects unauthenticated footprint approvals before any PostGIS mutation", async () => {
    const caller = appRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: null,
    });
    await expect(caller.postgis.updateFootprint(validUpdate)).rejects.toThrow(
      "Please login"
    );
  });

  it("rejects Citizen footprint approvals before any PostGIS mutation", async () => {
    const caller = appRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: {
        id: 1,
        clerkUserId: "user_field_citizen",
        name: "Field user",
        email: null,
        loginMethod: null,
        role: "citizen",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });
    await expect(caller.postgis.updateFootprint(validUpdate)).rejects.toThrow(
      "required permission"
    );
  });

  it("rejects height and ownership writes without separately cited authority evidence", async () => {
    const caller = appRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: {
        id: 2,
        clerkUserId: "user_authority_reviewer",
        name: "Authority reviewer",
        email: null,
        loginMethod: "clerk",
        role: "authority",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    await expect(
      caller.postgis.updateFootprint({
        ...validUpdate,
        heightSource: undefined,
      })
    ).rejects.toThrow("authority-issued height source reference");

    await expect(
      caller.postgis.updateFootprint({
        ulpin: validUpdate.ulpin,
        editNote: validUpdate.editNote,
        ownershipRecord: {
          parcelReference: "Plot 808 P",
          ulpinRecord: "ULPIN-PENDING",
          ownerName: "Restricted authority record",
          ownershipBasis: "Authority workflow evidence",
        },
      })
    ).rejects.toThrow("verified ownership or parcel source reference");
  });

  it("keeps role enforcement and evidence checks on the server, with matching authority-editor guidance", () => {
    expect(routerSource).toContain("authorityProcedure");
    expect(routerSource).toContain("authority-issued height source reference");
    expect(routerSource).toContain(
      "verified ownership or parcel source reference"
    );
    expect(postgisSource).toContain(
      "geometry_revision = CASE WHEN $2::jsonb IS NOT NULL"
    );
    expect(homeSource).toContain('authQuery.data?.role === "authority"');
    expect(homeSource).toContain("Add the authority height source");
  });
});
