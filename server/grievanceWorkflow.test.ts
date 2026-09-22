import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { PlatformRoles } from "@shared/permissions";
import type { TrpcContext } from "./_core/context";

function createMockContext(userOverrides: {
  clerkUserId?: string;
  role?: string;
  name?: string;
  email?: string;
} = {}): TrpcContext {
  const role = userOverrides.role ?? PlatformRoles.CITIZEN;
  return {
    user: {
      id: 1,
      clerkUserId: userOverrides.clerkUserId ?? "user_test_citizen",
      role: role as any,
      status: "ACTIVE",
      email: userOverrides.email ?? "citizen@test.gov.in",
      name: userOverrides.name ?? "Test Citizen",
      phone: "+91 98765 00000",
      departmentId: null,
      districtId: null,
      organizationId: null,
      jurisdiction: "Patna Central",
      designation: "Citizen Reporter",
      lastSignedIn: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

describe("Cadastral Grievance & Property Sealing Enforcement Lifecycle", () => {
  let createdGrievanceId: number;
  let grievanceNumber: string;

  it("1. Allows Citizen to file a geo-located cadastral grievance with photos and ULPIN", async () => {
    const ctx = createMockContext({
      clerkUserId: "user_citizen_101",
      role: PlatformRoles.CITIZEN,
      name: "Aman Sinha",
    });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.grievance.submit({
      ulpinOrReference: "IN-BR-PAT-0088-3D-BLD",
      buildingName: "Kankarbagh High-Rise Complex",
      category: "HEIGHT_VIOLATION",
      title: "Illegal 6th Floor Construction Exceeding 24m Limit",
      details: "Contractor has added an extra rooftop storey with no building sanction from municipal corporation.",
      latitude: "25.601200",
      longitude: "85.152300",
      evidencePhotos: ["https://example.com/evidence-photo-1.jpg"],
      citizenName: "Aman Sinha",
      citizenContact: "+91 99887 76655",
      isAnonymous: false,
    });

    expect(result).toBeDefined();
    expect(result.grievanceNumber).toMatch(/^GRV-2026-PAT-\d+$/);
    expect(result.status).toBe("SUBMITTED");
    expect(result.category).toBe("HEIGHT_VIOLATION");
    expect(result.ulpinOrReference).toBe("IN-BR-PAT-0088-3D-BLD");

    createdGrievanceId = result.id;
    grievanceNumber = result.grievanceNumber;
  });

  it("2. Allows Citizen and Public to fetch and track the submitted grievance", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const fetched = await caller.grievance.getById({ idOrNumber: createdGrievanceId });
    expect(fetched).toBeDefined();
    expect(fetched?.grievanceNumber).toBe(grievanceNumber);
    expect(fetched?.status).toBe("SUBMITTED");
  });

  it("3. Blocks non-authority users from rejecting or assigning surveyor missions", async () => {
    const citizenCtx = createMockContext({ role: PlatformRoles.CITIZEN });
    const citizenCaller = appRouter.createCaller(citizenCtx);

    await expect(
      citizenCaller.grievance.authorityAction({
        grievanceId: createdGrievanceId,
        action: "REJECT",
        rejectionReason: "False complaint test",
      })
    ).rejects.toThrow();
  });

  it("4. Allows Authority Officer to reject a false grievance with formal justification", async () => {
    // Create a temporary false grievance to reject
    const citizenCaller = appRouter.createCaller(createMockContext());
    const tempGrievance = await citizenCaller.grievance.submit({
      ulpinOrReference: "IN-BR-PAT-9999-3D",
      category: "OTHER",
      title: "Frivolous complaint without basis",
      details: "Building color does not match my aesthetic preference.",
    });

    const authorityCtx = createMockContext({
      clerkUserId: "user_authority_officer",
      role: PlatformRoles.AUTHORITY_OFFICER,
      name: "Officer Sunita Roy",
    });
    const authorityCaller = appRouter.createCaller(authorityCtx);

    const rejected = await authorityCaller.grievance.authorityAction({
      grievanceId: tempGrievance.id,
      action: "REJECT",
      rejectionReason: "Complaint is frivolous and does not violate any municipal building bylaws or cadastral regulations.",
    });

    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionReason).toContain("frivolous");
  });

  it("5. Allows Authority Officer to dispatch a Field Surveyor for on-site verification", async () => {
    const authorityCtx = createMockContext({
      clerkUserId: "user_authority_officer",
      role: PlatformRoles.AUTHORITY_OFFICER,
      name: "Officer Sunita Roy",
    });
    const authorityCaller = appRouter.createCaller(authorityCtx);

    const assigned = await authorityCaller.grievance.authorityAction({
      grievanceId: createdGrievanceId,
      action: "ASSIGN_SURVEYOR",
      surveyorClerkUserId: "user_surveyor_field_1",
      surveyorName: "Surveyor Alok Verma",
      instructions: "Conduct GNSS RTK CORS height survey and measure total structure elevation with laser distometer.",
      priority: "HIGH",
      targetInspectionDays: 2,
    });

    expect(assigned.status).toBe("SURVEYOR_ASSIGNED");
    expect(assigned.assignedSurveyorClerkUserId).toBe("user_surveyor_field_1");
    expect(assigned.assignedSurveyorName).toBe("Surveyor Alok Verma");
  });

  it("6. Allows Field Surveyor to submit on-site measurement findings & photo evidence", async () => {
    const surveyorCtx = createMockContext({
      clerkUserId: "user_surveyor_field_1",
      role: PlatformRoles.SURVEYOR,
      name: "Surveyor Alok Verma",
    });
    const surveyorCaller = appRouter.createCaller(surveyorCtx);

    const verified = await surveyorCaller.grievance.surveyorSubmitReport({
      grievanceId: createdGrievanceId,
      actualHeightMetres: 28.5,
      approvedHeightMetres: 21.0,
      actualFloors: 6,
      approvedFloors: 4,
      fireSafetyClearance: "FAILED",
      setbackEncroachmentMetres: 1.5,
      sitePhotos: ["https://example.com/site-verification-laser.jpg"],
      remarks: "Field laser inspection confirmed building height is 28.5m (exceeds sanctioned 21.0m limit by 7.5m). 2 unapproved rooftop floors erected.",
      verdict: "VIOLATION_CONFIRMED",
    });

    expect(verified.status).toBe("FIELD_VERIFIED");
    expect(verified.surveyorReport).toBeDefined();

    const parsedReport = JSON.parse(verified.surveyorReport!);
    expect(parsedReport.actualHeightMetres).toBe(28.5);
    expect(parsedReport.verdict).toBe("VIOLATION_CONFIRMED");
  });

  it("7. Allows Super Admin to execute a formal Property Sealing Order on the verified violation", async () => {
    const superAdminCtx = createMockContext({
      clerkUserId: "user_super_admin",
      role: PlatformRoles.SUPER_ADMIN,
      name: "District Magistrate / Super Administrator",
    });
    const superAdminCaller = appRouter.createCaller(superAdminCtx);

    const sealed = await superAdminCaller.grievance.adminEnforcement({
      grievanceId: createdGrievanceId,
      actionType: "SEAL_PROPERTY",
      fineAmountInr: 250000,
      legalNoticeText: "Under Section 314 of Bihar Municipal Act, this property is hereby SEALED with immediate effect due to gross height and floor limit violations.",
    });

    expect(sealed.status).toBe("SEALED");
    expect(sealed.enforcementAction).toBeDefined();

    const parsedEnforcement = JSON.parse(sealed.enforcementAction!);
    expect(parsedEnforcement.actionType).toBe("SEAL_PROPERTY");
    expect(parsedEnforcement.orderNumber).toMatch(/^SEAL-ORD-2026-PAT-\d+$/);
    expect(parsedEnforcement.fineAmountInr).toBe(250000);
  });

  it("8. Computes grievance statistics accurately across platform roles", async () => {
    const caller = appRouter.createCaller(createMockContext());
    const stats = await caller.grievance.stats();

    expect(stats.totalGrievances).toBeGreaterThanOrEqual(1);
    expect(stats.sealedProperties).toBeGreaterThanOrEqual(1);
    expect(stats.rejectedCount).toBeGreaterThanOrEqual(1);
  });
});
