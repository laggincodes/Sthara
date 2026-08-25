import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: string[] } {
  const clearedCookies: string[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    clerkUserId: "user_clerk_sample",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "clerk",
    role: "citizen",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    ctx: {
      user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string) => clearedCookies.push(name),
      } as TrpcContext["res"],
    },
    clearedCookies,
  };
}

describe("auth.logout", () => {
  it("reports success without clearing an application-managed session cookie", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.logout()).resolves.toEqual({ success: true });
    expect(clearedCookies).toHaveLength(0);
  });
});
