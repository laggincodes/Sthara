/**
 * Centralized Role-Based Access Control (RBAC) & Permissions Definitions
 * SIH-2026: 3D ULPIN Generation and Vertical Property Mapping System
 */

export const PlatformRoles = {
  SUPER_ADMIN: "SUPER_ADMIN",
  AUTHORITY_ADMIN: "AUTHORITY_ADMIN",
  AUTHORITY_OFFICER: "AUTHORITY_OFFICER",
  GOVERNMENT_EMPLOYEE: "GOVERNMENT_EMPLOYEE",
  SURVEYOR: "SURVEYOR",
  CITIZEN: "CITIZEN",
} as const;

export type CanonicalPlatformRole =
  (typeof PlatformRoles)[keyof typeof PlatformRoles];

export type PlatformRoleInput =
  | CanonicalPlatformRole
  | "admin"
  | "authority"
  | "government_employee"
  | "citizen";

export const UserStatuses = {
  INVITED: "INVITED",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  DISABLED: "DISABLED",
} as const;

export type UserStatus = (typeof UserStatuses)[keyof typeof UserStatuses];

export const Permissions = {
  // Citizen & Property
  VIEW_OWN_PROPERTY: "VIEW_OWN_PROPERTY",
  CREATE_PROPERTY_APPLICATION: "CREATE_PROPERTY_APPLICATION",
  VIEW_ASSIGNED_PROPERTIES: "VIEW_ASSIGNED_PROPERTIES",
  VIEW_ALL_PROPERTIES: "VIEW_ALL_PROPERTIES",
  VERIFY_PROPERTY: "VERIFY_PROPERTY",
  APPROVE_PROPERTY: "APPROVE_PROPERTY",
  REJECT_PROPERTY: "REJECT_PROPERTY",

  // GIS & Survey
  UPLOAD_SURVEY_DATA: "UPLOAD_SURVEY_DATA",
  UPLOAD_GEOJSON: "UPLOAD_GEOJSON",
  UPLOAD_GNSS_DATA: "UPLOAD_GNSS_DATA",
  VIEW_3D_PROPERTY: "VIEW_3D_PROPERTY",
  VIEW_GIS_DATA: "VIEW_GIS_DATA",

  // Administration
  MANAGE_USERS: "MANAGE_USERS",
  MANAGE_AUTHORITIES: "MANAGE_AUTHORITIES",
  MANAGE_DEPARTMENTS: "MANAGE_DEPARTMENTS",
  MANAGE_DISTRICTS: "MANAGE_DISTRICTS",
  MANAGE_ORGANIZATIONS: "MANAGE_ORGANIZATIONS",
  MANAGE_ROLES: "MANAGE_ROLES",
  MANAGE_PERMISSIONS: "MANAGE_PERMISSIONS",
  MANAGE_SYSTEM: "MANAGE_SYSTEM",
  VIEW_AUDIT_LOGS: "VIEW_AUDIT_LOGS",
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const ALL_PERMISSIONS: Permission[] = Object.values(Permissions);

/**
 * Maps each canonical role to its set of granted permissions.
 */
export const ROLE_PERMISSIONS: Record<CanonicalPlatformRole, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,

  AUTHORITY_ADMIN: [
    Permissions.VIEW_ASSIGNED_PROPERTIES,
    Permissions.VIEW_ALL_PROPERTIES,
    Permissions.VERIFY_PROPERTY,
    Permissions.APPROVE_PROPERTY,
    Permissions.REJECT_PROPERTY,
    Permissions.VIEW_3D_PROPERTY,
    Permissions.VIEW_GIS_DATA,
    Permissions.UPLOAD_GEOJSON,
    Permissions.VIEW_AUDIT_LOGS,
    Permissions.MANAGE_AUTHORITIES,
  ],

  AUTHORITY_OFFICER: [
    Permissions.VIEW_ASSIGNED_PROPERTIES,
    Permissions.VERIFY_PROPERTY,
    Permissions.APPROVE_PROPERTY,
    Permissions.REJECT_PROPERTY,
    Permissions.VIEW_3D_PROPERTY,
    Permissions.VIEW_GIS_DATA,
  ],

  GOVERNMENT_EMPLOYEE: [
    Permissions.VIEW_ASSIGNED_PROPERTIES,
    Permissions.VIEW_3D_PROPERTY,
    Permissions.VIEW_GIS_DATA,
    Permissions.VERIFY_PROPERTY,
  ],

  SURVEYOR: [
    Permissions.UPLOAD_SURVEY_DATA,
    Permissions.UPLOAD_GEOJSON,
    Permissions.UPLOAD_GNSS_DATA,
    Permissions.VIEW_3D_PROPERTY,
    Permissions.VIEW_GIS_DATA,
    Permissions.VIEW_ASSIGNED_PROPERTIES,
  ],

  CITIZEN: [
    Permissions.VIEW_OWN_PROPERTY,
    Permissions.CREATE_PROPERTY_APPLICATION,
    Permissions.VIEW_3D_PROPERTY,
  ],
};

/**
 * Normalizes any legacy or case-variant role string to its canonical uppercase representation.
 */
export function canonicalRole(
  role: string | null | undefined
): CanonicalPlatformRole {
  if (!role) return PlatformRoles.CITIZEN;
  const upper = role.toUpperCase();
  switch (upper) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return PlatformRoles.SUPER_ADMIN;
    case "AUTHORITY_ADMIN":
      return PlatformRoles.AUTHORITY_ADMIN;
    case "AUTHORITY_OFFICER":
    case "AUTHORITY":
      return PlatformRoles.AUTHORITY_OFFICER;
    case "GOVERNMENT_EMPLOYEE":
    case "GOVERNMENT":
      return PlatformRoles.GOVERNMENT_EMPLOYEE;
    case "SURVEYOR":
      return PlatformRoles.SURVEYOR;
    case "CITIZEN":
    default:
      return PlatformRoles.CITIZEN;
  }
}

/**
 * Checks if a given role has a specific permission.
 */
export function hasPermission(
  role: string | null | undefined,
  permission: Permission
): boolean {
  const canon = canonicalRole(role);
  const permissions = ROLE_PERMISSIONS[canon] ?? [];
  return permissions.includes(permission);
}

/**
 * Returns the complete list of permissions for a role.
 */
export function getPermissionsForRole(
  role: string | null | undefined
): Permission[] {
  const canon = canonicalRole(role);
  return ROLE_PERMISSIONS[canon] ?? [];
}

/**
 * Checks if a role is a privileged staff / admin role (not a public citizen).
 */
export function isPrivilegedRole(role: string | null | undefined): boolean {
  const canon = canonicalRole(role);
  return canon !== PlatformRoles.CITIZEN;
}

/**
 * Formats a role identifier into a human-readable title.
 */
export function formatRole(role: string | null | undefined): string {
  const canon = canonicalRole(role);
  switch (canon) {
    case PlatformRoles.SUPER_ADMIN:
      return "Super Administrator";
    case PlatformRoles.AUTHORITY_ADMIN:
      return "Authority Administrator";
    case PlatformRoles.AUTHORITY_OFFICER:
      return "Authority Officer";
    case PlatformRoles.GOVERNMENT_EMPLOYEE:
      return "Government Employee";
    case PlatformRoles.SURVEYOR:
      return "Field Surveyor";
    case PlatformRoles.CITIZEN:
    default:
      return "Citizen";
  }
}

/**
 * Returns default dashboard route for a given role.
 */
export function getRoleDashboardPath(role: string | null | undefined): string {
  const canon = canonicalRole(role);
  switch (canon) {
    case PlatformRoles.SUPER_ADMIN:
      return "/admin/dashboard";
    case PlatformRoles.AUTHORITY_ADMIN:
    case PlatformRoles.AUTHORITY_OFFICER:
      return "/authority/dashboard";
    case PlatformRoles.GOVERNMENT_EMPLOYEE:
      return "/government/dashboard";
    case PlatformRoles.SURVEYOR:
      return "/surveyor/dashboard";
    case PlatformRoles.CITIZEN:
    default:
      return "/dashboard";
  }
}
