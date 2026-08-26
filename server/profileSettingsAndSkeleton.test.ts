import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");

describe("profile settings and dashboard loading states", () => {
  it("provides a dedicated profile route that updates Clerk identity without editing application roles", () => {
    const appSource = fs.readFileSync(
      path.join(projectRoot, "client/src/App.tsx"),
      "utf8"
    );
    const profileSource = fs.readFileSync(
      path.join(projectRoot, "client/src/pages/ProfileSettings.tsx"),
      "utf8"
    );

    expect(appSource).toContain('path="/profile-settings"');
    expect(profileSource).toContain("clerkUser.update");
    expect(profileSource).toContain("openUserProfile");
    expect(profileSource).toContain("This page cannot change roles.");
    expect(profileSource).not.toContain("assignRole");
  });

  it("renders accessible skeleton widgets while the protected dashboard summary is loading", () => {
    const dashboardSource = fs.readFileSync(
      path.join(projectRoot, "client/src/pages/RoleConsole.tsx"),
      "utf8"
    );
    const skeletonSource = fs.readFileSync(
      path.join(projectRoot, "client/src/components/DashboardWidgetSkeleton.tsx"),
      "utf8"
    );

    expect(dashboardSource).toContain("dashboardSummary.isLoading");
    expect(dashboardSource).toContain("DashboardWidgetSkeleton");
    expect(skeletonSource).toContain('aria-label="Loading dashboard widgets"');
    expect(skeletonSource).toContain('aria-busy="true"');
  });
});
