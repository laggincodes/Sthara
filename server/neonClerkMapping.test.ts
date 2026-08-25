import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");

describe("Neon-backed Clerk profile mapping", () => {
  it("uses the configured PostgreSQL source for server-side Clerk profiles", () => {
    const dbSource = fs.readFileSync(
      path.join(projectRoot, "server/db.ts"),
      "utf8"
    );
    const configSource = fs.readFileSync(
      path.join(projectRoot, "drizzle.config.ts"),
      "utf8"
    );

    expect(dbSource).toContain("drizzle-orm/node-postgres");
    expect(dbSource).toContain("process.env.POSTGIS_DATABASE_URL ?? process.env.DATABASE_URL");
    expect(configSource).toContain('dialect: "postgresql"');
  });

  it("does not send a Clerk-signed-in visitor back through the access portal when profile mapping is unavailable", () => {
    const roleConsole = fs.readFileSync(
      path.join(projectRoot, "client/src/pages/RoleConsole.tsx"),
      "utf8"
    );

    expect(roleConsole).toContain("ApplicationProfileUnavailable");
    expect(roleConsole).toContain("if (isSignedIn && (!user || !role))");
    expect(roleConsole).toContain("The app will not send you back through sign-in");
  });
});
