import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { clerkClient, getAuth } from "@clerk/express";
import type { User } from "../../drizzle/schema";
import { getUserByClerkUserId, upsertUser } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  const { userId } = getAuth(opts.req);
  if (userId) {
    try {
      user = (await getUserByClerkUserId(userId)) ?? null;
      if (!user) {
        const clerkUser = await clerkClient.users.getUser(userId);
        await upsertUser({
          clerkUserId: userId,
          name: clerkUser.fullName || clerkUser.username || null,
          email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
          loginMethod: "clerk",
        });
        user = (await getUserByClerkUserId(userId)) ?? null;
      } else {
        await upsertUser({
          clerkUserId: userId,
          name: user.name,
          email: user.email,
          loginMethod: "clerk",
          role: user.role,
          lastSignedIn: new Date(),
        });
      }
    } catch (error) {
      console.warn("[Clerk] Session user could not be mapped to application data", error);
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
