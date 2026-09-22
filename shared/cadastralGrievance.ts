import { z } from "zod";
export type { CadastralGrievance } from "../drizzle/schema";

export const GrievanceCategories = {
  HEIGHT_VIOLATION: "HEIGHT_VIOLATION",
  ZONING_PROHIBITED_AREA: "ZONING_PROHIBITED_AREA",
  FIRE_SAFETY_HAZARD: "FIRE_SAFETY_HAZARD",
  ENCROACHMENT: "ENCROACHMENT",
  UNAUTHORIZED_CONSTRUCTION: "UNAUTHORIZED_CONSTRUCTION",
  TITLE_DISPUTE: "TITLE_DISPUTE",
  OTHER: "OTHER",
} as const;

export type GrievanceCategory =
  (typeof GrievanceCategories)[keyof typeof GrievanceCategories];

export const GrievanceCategoryMeta: Record<
  GrievanceCategory,
  { label: string; icon: string; description: string; badgeColor: string }
> = {
  HEIGHT_VIOLATION: {
    label: "Excess Building Height / Illegal Floors",
    icon: "Building2",
    description: "Building exceeds sanctioned height limit or has unapproved rooftop floors.",
    badgeColor: "#f59e0b",
  },
  ZONING_PROHIBITED_AREA: {
    label: "Illegal / Prohibited / Red Light Zone Construction",
    icon: "ShieldAlert",
    description: "Commercial or unapproved construction in protected, green, or restricted zones.",
    badgeColor: "#ef4444",
  },
  FIRE_SAFETY_HAZARD: {
    label: "Fire Safety & Emergency Access Violation",
    icon: "Flame",
    description: "Lack of fire escape, blocked emergency access, or no fire NOC.",
    badgeColor: "#f97316",
  },
  ENCROACHMENT: {
    label: "Setback & Public Land Encroachment",
    icon: "Scaling",
    description: "Construction encroaching road buffer, government land, or neighbor setbacks.",
    badgeColor: "#eab308",
  },
  UNAUTHORIZED_CONSTRUCTION: {
    label: "Unauthorized Construction (No Sanctioned Map)",
    icon: "AlertOctagon",
    description: "Erecting structural elements without municipality approved building permit.",
    badgeColor: "#ec4899",
  },
  TITLE_DISPUTE: {
    label: "Cadastral Boundary & Ownership Dispute",
    icon: "FileWarning",
    description: "Disputed boundaries, fraudulent survey demarcation, or double registration.",
    badgeColor: "#8b5cf6",
  },
  OTHER: {
    label: "Other Cadastral / Civic Non-Compliance",
    icon: "HelpCircle",
    description: "General cadastral, building code, or civic spatial irregularities.",
    badgeColor: "#06b6d4",
  },
};

export const GrievanceStatuses = {
  SUBMITTED: "SUBMITTED",
  REJECTED: "REJECTED",
  SURVEYOR_ASSIGNED: "SURVEYOR_ASSIGNED",
  FIELD_VERIFIED: "FIELD_VERIFIED",
  SEALED: "SEALED",
  DEMOLITION_ORDER: "DEMOLITION_ORDER",
  PENALTY_ISSUED: "PENALTY_ISSUED",
  RESOLVED: "RESOLVED",
} as const;

export type GrievanceStatus =
  (typeof GrievanceStatuses)[keyof typeof GrievanceStatuses];

export const GrievanceStatusMeta: Record<
  GrievanceStatus,
  { label: string; stepNumber: number; stepTitle: string; color: string; bg: string }
> = {
  SUBMITTED: {
    label: "Grievance Filed · Under Triage",
    stepNumber: 1,
    stepTitle: "Citizen Submission",
    color: "#38bdf8",
    bg: "rgba(56, 189, 248, 0.12)",
  },
  REJECTED: {
    label: "Rejected by Authority (Invalid / False)",
    stepNumber: 2,
    stepTitle: "Authority Review",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.12)",
  },
  SURVEYOR_ASSIGNED: {
    label: "Field Surveyor Dispatched",
    stepNumber: 2,
    stepTitle: "Field Audit Scheduled",
    color: "#fbbf24",
    bg: "rgba(251, 191, 36, 0.12)",
  },
  FIELD_VERIFIED: {
    label: "On-Site Field Audit Completed",
    stepNumber: 3,
    stepTitle: "Surveyor Findings Submitted",
    color: "#a855f7",
    bg: "rgba(168, 85, 247, 0.12)",
  },
  SEALED: {
    label: "⛔ PROPERTY SEALED (Under Municipal Order)",
    stepNumber: 4,
    stepTitle: "Enforcement Action Executed",
    color: "#f43f5e",
    bg: "rgba(244, 63, 94, 0.18)",
  },
  DEMOLITION_ORDER: {
    label: "⚠️ Demolition Notice Issued",
    stepNumber: 4,
    stepTitle: "Enforcement Action Executed",
    color: "#ea580c",
    bg: "rgba(234, 88, 12, 0.16)",
  },
  PENALTY_ISSUED: {
    label: "Statutory Penalty Levied",
    stepNumber: 4,
    stepTitle: "Enforcement Action Executed",
    color: "#eab308",
    bg: "rgba(234, 179, 8, 0.16)",
  },
  RESOLVED: {
    label: "✅ Resolved & Closed (Compliant / Rectified)",
    stepNumber: 4,
    stepTitle: "Case Resolved",
    color: "#22c55e",
    bg: "rgba(34, 197, 94, 0.14)",
  },
};

export type SurveyorReportData = {
  actualHeightMetres?: number | null;
  approvedHeightMetres?: number | null;
  actualFloors?: number | null;
  approvedFloors?: number | null;
  fireSafetyClearance: "PASSED" | "FAILED" | "NOT_APPLICABLE";
  setbackEncroachmentMetres?: number | null;
  sitePhotos?: string[];
  remarks: string;
  verdict: "VIOLATION_CONFIRMED" | "COMPLIANT_NO_VIOLATION" | "RE_SURVEY_RECOMMENDED";
  submittedAt: string;
  surveyorClerkUserId: string;
  surveyorName: string;
};

export type EnforcementActionData = {
  actionType: "SEAL_PROPERTY" | "DEMOLITION_ORDER" | "PENALTY" | "CLEARED" | "RE_SURVEY";
  orderNumber: string;
  fineAmountInr?: number | null;
  legalNoticeText: string;
  issuedByClerkUserId: string;
  issuedByName: string;
  issuedByRole: string;
  executedAt: string;
};

export const citizenGrievanceInputSchema = z.object({
  ulpinOrReference: z.string().trim().min(2, "Parcel or Building reference is required"),
  buildingName: z.string().trim().optional(),
  category: z.enum([
    "HEIGHT_VIOLATION",
    "ZONING_PROHIBITED_AREA",
    "FIRE_SAFETY_HAZARD",
    "ENCROACHMENT",
    "UNAUTHORIZED_CONSTRUCTION",
    "TITLE_DISPUTE",
    "OTHER",
  ]),
  title: z.string().trim().min(4, "Title must be at least 4 characters"),
  details: z.string().trim().min(10, "Details must be at least 10 characters"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  evidencePhotos: z.array(z.string()).optional(), // Array of base64 strings or URLs
  citizenName: z.string().trim().optional(),
  citizenContact: z.string().trim().optional(),
  isAnonymous: z.boolean().default(false),
});

export type CitizenGrievanceInput = z.infer<typeof citizenGrievanceInputSchema>;
