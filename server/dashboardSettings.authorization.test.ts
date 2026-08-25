import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: "citizen" | "authority" | "admin"): TrpcContext {
  return {
    user: {
      id: 1,
      clerkUserId: `user_${role}`,
      email: `${role}@example.test`,
      name: `${role} user`,
      loginMethod: "clerk",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("platform.adminSettings", () => {
  it("rejects non-administrator dashboard settings requests on the server", async () => {
    const citizenCaller = appRouter.createCaller(createContext("citizen"));
    const authorityCaller = appRouter.createCaller(createContext("authority"));

    await expect(citizenCaller.platform.adminSettings()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(authorityCaller.platform.adminSettings()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("returns settings context only to a server-assigned Administrator", async () => {
    const adminCaller = appRouter.createCaller(createContext("admin"));

    await expect(adminCaller.platform.adminSettings()).resolves.toMatchObject({
      access: "server-assigned-administrator-only",
      sections: expect.arrayContaining(["Role assignment", "Audit access"]),
    });
  });
});
