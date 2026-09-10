/**
 * Clerk Invitation & Account Provisioning Service
 * Dispatches official Clerk invitation emails to authority and staff members.
 * Supports production Clerk REST API and offline/test fallback.
 */

export interface CreateClerkInvitationInput {
  email: string;
  role: string;
  departmentId?: number | null;
  districtId?: number | null;
  organizationId?: number | null;
  designation?: string | null;
  redirectUrl?: string;
}

export interface ClerkInvitationResult {
  success: boolean;
  invitationId?: string;
  invitationUrl?: string;
  status: "sent" | "simulated" | "failed";
  email: string;
  error?: string;
}

export async function createClerkStaffInvitation(
  input: CreateClerkInvitationInput
): Promise<ClerkInvitationResult> {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  const origin =
    process.env.APP_ORIGIN ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";
  const redirectUrl =
    input.redirectUrl ||
    (origin.startsWith("http") ? origin : `https://${origin}`) + "/staff/login";

  if (!secretKey) {
    console.info(
      `[Clerk Invitation (Mock/Dev)] Account invitation simulated for ${input.email} (Role: ${input.role}). Target: ${redirectUrl}`
    );
    return {
      success: true,
      invitationId: `inv_sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      invitationUrl: redirectUrl,
      status: "simulated",
      email: input.email,
    };
  }

  try {
    const response = await fetch("https://api.clerk.com/v1/invitations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: input.email,
        redirect_url: redirectUrl,
        public_metadata: {
          role: input.role,
          departmentId: input.departmentId ?? null,
          districtId: input.districtId ?? null,
          organizationId: input.organizationId ?? null,
          designation: input.designation ?? null,
        },
        ignore_existing: true,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.warn(
        `[Clerk Invitation] API responded with HTTP ${response.status}:`,
        errBody
      );
      // If already exists, fetch the existing pending invitation URL
      if (errBody.includes("already exists") || errBody.includes("duplicate")) {
        const pending = await getPendingClerkInvitations();
        const existingInvite = pending.find(
          p => p.email_address.toLowerCase() === input.email.toLowerCase()
        );
        return {
          success: true,
          invitationId: existingInvite?.id,
          invitationUrl: existingInvite?.url,
          status: "sent",
          email: input.email,
        };
      }
      return {
        success: false,
        status: "failed",
        email: input.email,
        error: `Clerk API Error (${response.status}): ${response.statusText}`,
      };
    }

    const data = (await response.json()) as {
      id?: string;
      status?: string;
      url?: string;
    };

    return {
      success: true,
      invitationId: data.id,
      invitationUrl: data.url,
      status: "sent",
      email: input.email,
    };
  } catch (error) {
    console.warn(
      `[Clerk Invitation] Network error while contacting Clerk API:`,
      error
    );
    return {
      success: true,
      invitationId: `inv_fallback_${Date.now()}`,
      invitationUrl: redirectUrl,
      status: "simulated",
      email: input.email,
    };
  }
}

export interface ClerkPendingInvitation {
  id: string;
  email_address: string;
  status: string;
  url?: string;
  created_at: number;
}

/**
 * Fetch all pending invitations from Clerk REST API
 */
export async function getPendingClerkInvitations(): Promise<
  ClerkPendingInvitation[]
> {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) return [];

  try {
    const response = await fetch(
      "https://api.clerk.com/v1/invitations?status=pending",
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );
    if (!response.ok) return [];
    const data = (await response.json()) as ClerkPendingInvitation[];
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn("[Clerk Invitations] Failed to fetch pending invitations:", err);
    return [];
  }
}

/**
 * Revoke and resend invitation for an email address
 */
export async function resendClerkStaffInvitation(
  email: string,
  role = "AUTHORITY_OFFICER"
): Promise<ClerkInvitationResult> {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (secretKey) {
    // Check if pending invitation exists to revoke first
    const pending = await getPendingClerkInvitations();
    const existing = pending.find(
      p => p.email_address.toLowerCase() === cleanEmail
    );
    if (existing?.id) {
      try {
        await fetch(`https://api.clerk.com/v1/invitations/${existing.id}/revoke`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        });
      } catch {
        // ignore revoke error
      }
    }
  }

  return createClerkStaffInvitation({ email: cleanEmail, role });
}

