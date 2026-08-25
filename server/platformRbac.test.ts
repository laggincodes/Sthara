import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(projectRoot, relativePath), "utf8");

const schemaSource = readProjectFile("drizzle/schema.ts");
const dbSource = readProjectFile("server/db.ts");
const routerSource = readProjectFile("server/routers.ts");
const trpcSource = readProjectFile("server/_core/trpc.ts");
const roleConsoleSource = readProjectFile("client/src/pages/RoleConsole.tsx");
const appSource = readProjectFile("client/src/App.tsx");
const portalStyles = readProjectFile("client/src/index.css");

describe("secure role-based cadastral platform foundation", () => {
  it("defines non-privileged default accounts and explicit privileged platform roles", () => {
    expect(schemaSource).toContain('"citizen"');
    expect(schemaSource).toContain('"authority"');
    expect(schemaSource).toContain('"government_employee"');
    expect(schemaSource).toContain('"admin"');
    expect(schemaSource).toContain('platformRole.default("citizen")');
  });

  it("keeps privilege checks in backend procedures instead of trusting role-console UI", () => {
    expect(trpcSource).toContain("export const authorityProcedure");
    expect(trpcSource).toContain("export const governmentProcedure");
    expect(trpcSource).toContain("allowedRoles.includes(ctx.user.role)");
    expect(routerSource).toContain("upload: authorityProcedure");
    expect(routerSource).toContain("submitEvidence: authorityProcedure");
    expect(routerSource).toContain("adminUsers: adminProcedure");
    expect(routerSource).toContain("assignRole: adminProcedure");
    expect(routerSource).toContain("adminSettings: adminProcedure");
    expect(routerSource).toContain(
      "Administrators cannot change their own role."
    );
  });

  it("records submission and review states without silently making evidence authoritative", () => {
    expect(schemaSource).toContain('"submitted"');
    expect(schemaSource).toContain('"under_review"');
    expect(schemaSource).toContain('"verified"');
    expect(schemaSource).toContain('"rejected"');
    expect(schemaSource).toContain("verificationSubmissions");
    expect(dbSource).toContain("createVerificationSubmission");
    expect(dbSource).toContain("reviewVerificationSubmission");
    expect(roleConsoleSource).toContain(
      "Evidence remains unverified until reviewed"
    );
    expect(roleConsoleSource).toContain("authority-verified yet");
  });

  it("writes sensitive workflow events to an audit log and limits audit access to administrators", () => {
    expect(schemaSource).toContain("auditLogs");
    expect(dbSource).toContain("createAuditLog");
    expect(routerSource).toContain("authoritative_footprint_updated");
    expect(routerSource).toContain("evidence_file_uploaded");
    expect(routerSource).toContain("auditLogs: adminProcedure");
    expect(roleConsoleSource).toContain("IMMUTABLE AUDIT TRAIL");
  });

  it("uses the configured secure identity flow rather than implementing an unsafe frontend role selector", () => {
    expect(roleConsoleSource).toContain('from "@clerk/react"');
    expect(roleConsoleSource).toContain("<SignIn");
    expect(roleConsoleSource).toContain("<SignUp");
    expect(roleConsoleSource).toContain("Clerk manages identity, passwords");
    expect(roleConsoleSource).toContain("const safeReturnTo");
    expect(roleConsoleSource).toContain('fallbackRedirectUrl={safeReturnTo}');
    expect(roleConsoleSource).toContain(
      "The interface cannot grant permissions."
    );
    expect(roleConsoleSource).not.toContain("Sign up as Authority");
    expect(appSource).toContain('path="/" component={AccessPortal}');
    expect(appSource).toContain('path="/overview" component={Home}');
    expect(appSource).toContain('path="/access"');
    expect(appSource).toContain('path="/dashboard"');
    expect(roleConsoleSource).toContain('setLocation("/overview")');
  });

  it("keeps dashboard settings behind an administrator procedure and session controls tied to Clerk", () => {
    const homeSource = readProjectFile("client/src/pages/Home.tsx");
    const mainSource = readProjectFile("client/src/main.tsx");
    expect(homeSource).toContain("platform.adminSettings.useQuery");
    expect(homeSource).toContain("Administrator settings are locked");
    expect(homeSource).toContain("void session.logout()");
    expect(homeSource).toContain("/access?returnTo=/overview");
    expect(mainSource).toContain("appearance={clerkAppearance}");
    expect(mainSource).toContain('colorPrimary: "#2ad4d9"');
    expect(mainSource).toContain('card: "bg-transparent shadow-none border-0 w-full"');
    expect(portalStyles).not.toContain(".access-portal__clerk .cl-card");
  });
});
