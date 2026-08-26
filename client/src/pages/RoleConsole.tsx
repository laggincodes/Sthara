import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { DashboardWidgetSkeleton } from "@/components/DashboardWidgetSkeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { SignIn, SignUp } from "@clerk/react";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  FileWarning,
  LogOut,
  Map,
  ShieldCheck,
  UserRoundCheck,
  Settings2,
  Users,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type PlatformRole = "citizen" | "authority" | "government_employee" | "admin";

const roleCopy: Record<
  PlatformRole,
  { label: string; description: string; icon: typeof Users }
> = {
  citizen: {
    label: "Citizen property dashboard",
    description:
      "Search public source-backed property context and submit corrections without exposing personal owner data.",
    icon: Building2,
  },
  authority: {
    label: "Authority verification workspace",
    description:
      "Submit and review evidence through a recorded workflow. Evidence remains non-authoritative until review is completed.",
    icon: ClipboardCheck,
  },
  government_employee: {
    label: "Government operations dashboard",
    description:
      "Use aggregate mapping and verification progress indicators without unrestricted personal data access.",
    icon: Map,
  },
  admin: {
    label: "Administrator control room",
    description:
      "Manage role assignments and inspect immutable system audit records. Your own role cannot be changed here.",
    icon: ShieldCheck,
  },
};

const allowedReviewRoles: PlatformRole[] = ["authority", "admin"];
const allowedGovernmentRoles: PlatformRole[] = ["government_employee", "admin"];

function formatRole(role: PlatformRole) {
  return role.replaceAll("_", " ");
}

export function AccessPortal() {
  const [, setLocation] = useLocation();
  const returnTo = new URLSearchParams(window.location.search).get("returnTo");
  const safeReturnTo =
    returnTo?.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/dashboard";
  const [mode, setMode] = useState<"sign-in" | "sign-up">(() =>
    new URLSearchParams(window.location.search).get("mode") === "sign-up"
      ? "sign-up"
      : "sign-in"
  );

  return (
    <main className="access-portal">
      <section className="access-portal__context">
        <span>DEPARTMENT OF LAND RESOURCES · SECURE ACCESS</span>
        <h1>3D ULPIN · VPM</h1>
        <p>
          A source-aware 3D cadastral and vertical-property platform. Cesium,
          PostGIS, evidence locks, and audit workflows remain available after
          authentication.
        </p>
        <div className="access-portal__assurance">
          <ShieldCheck size={18} />
          <span>
            Privileged roles are assigned only by an Administrator through the
            backend. The interface cannot grant permissions.
          </span>
        </div>
      </section>
      <section className="access-portal__card" aria-labelledby="access-title">
        <UserRoundCheck size={24} />
        <span>ACCOUNT ACCESS</span>
        <h2 id="access-title">
          {mode === "sign-in" ? "Sign in securely" : "Create a secure account"}
        </h2>
        <p>
          Clerk manages identity, passwords, recovery, and session security.
          New accounts enter as Citizens until an Administrator assigns a
          different role on the server.
        </p>
        <div className="access-portal__mode" role="group" aria-label="Account access mode">
          <button
            type="button"
            className={mode === "sign-in" ? "is-active" : undefined}
            onClick={() => setMode("sign-in")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "sign-up" ? "is-active" : undefined}
            onClick={() => setMode("sign-up")}
          >
            Create account
          </button>
        </div>
        <div className="access-portal__clerk">
          {mode === "sign-in" ? (
            <SignIn
              fallbackRedirectUrl={safeReturnTo}
              signUpUrl="/access?mode=sign-up"
            />
          ) : (
            <SignUp fallbackRedirectUrl={safeReturnTo} signInUrl="/access" />
          )}
        </div>
        <button type="button" onClick={() => setLocation("/overview")}>
          View public project overview
        </button>
      </section>
    </main>
  );
}

function ApplicationProfileUnavailable({
  onRetry,
  onSignOut,
}: {
  onRetry: () => void;
  onSignOut: () => void;
}) {
  return (
    <main className="role-console role-console--profile-unavailable">
      <section className="role-console__profile-unavailable" aria-labelledby="profile-unavailable-title">
        <ShieldCheck size={28} />
        <span>SECURE SESSION CONFIRMED</span>
        <h1 id="profile-unavailable-title">Preparing your platform profile</h1>
        <p>
          Your Clerk sign-in remains valid, but the server could not load the
          application profile and backend-assigned role required for this
          dashboard. The app will not send you back through sign-in or grant a
          client-side role.
        </p>
        <div>
          <Button type="button" onClick={onRetry}>
            Retry profile connection
          </Button>
          <Button type="button" variant="outline" onClick={onSignOut}>
            <LogOut size={15} />
            Sign out safely
          </Button>
        </div>
      </section>
    </main>
  );
}

export default function RoleConsole() {
  const { user, loading, logout, refresh, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [issueForm, setIssueForm] = useState({
    recordReference: "",
    category: "footprint" as const,
    details: "",
  });
  const [evidenceForm, setEvidenceForm] = useState({
    recordReference: "",
    submissionType: "geometry" as const,
    sourceReference: "",
    sourceUrl: "",
    notes: "",
  });
  const role = user?.role as PlatformRole | undefined;
  const hasAuthority = Boolean(role && allowedReviewRoles.includes(role));
  const hasGovernment = Boolean(role && allowedGovernmentRoles.includes(role));
  const isAdmin = role === "admin";
  const dashboardSummary = trpc.platform.dashboardSummary.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const governmentSummary = trpc.platform.governmentSummary.useQuery(
    undefined,
    {
      enabled: hasGovernment,
    }
  );
  const verificationQueue = trpc.platform.verificationQueue.useQuery(
    undefined,
    {
      enabled: hasAuthority,
    }
  );
  const adminUsers = trpc.platform.adminUsers.useQuery(undefined, {
    enabled: isAdmin,
  });
  const auditLogs = trpc.platform.auditLogs.useQuery(undefined, {
    enabled: isAdmin,
  });
  const reportIssue = trpc.platform.reportIssue.useMutation({
    onSuccess: () => {
      setIssueForm({ recordReference: "", category: "footprint", details: "" });
      toast.success("Issue report submitted", {
        description:
          "The report is recorded for review; it does not modify map geometry.",
      });
    },
  });
  const submitEvidence = trpc.platform.submitEvidence.useMutation({
    onSuccess: () => {
      setEvidenceForm({
        recordReference: "",
        submissionType: "geometry",
        sourceReference: "",
        sourceUrl: "",
        notes: "",
      });
      void verificationQueue.refetch();
      toast.success("Evidence submission recorded", {
        description: "Status is submitted. It is not authority-verified yet.",
      });
    },
  });
  const reviewEvidence = trpc.platform.reviewEvidence.useMutation({
    onSuccess: () => {
      void verificationQueue.refetch();
      toast.success("Review state updated", {
        description: "The audit trail records the reviewer and outcome.",
      });
    },
  });
  const assignRole = trpc.platform.assignRole.useMutation({
    onSuccess: () => {
      void adminUsers.refetch();
      void auditLogs.refetch();
      toast.success("Role assignment recorded");
    },
  });
  const summaryCards = useMemo(
    () => [
      ["Source records", dashboardSummary.data?.records ?? "—"],
      [
        "Pending verification",
        dashboardSummary.data?.pendingVerification ?? "—",
      ],
      [
        "Reviewed submissions",
        dashboardSummary.data?.reviewedVerification ?? "—",
      ],
    ],
    [dashboardSummary.data]
  );

  if (loading) {
    return (
      <div className="role-console__loading">Confirming secure session…</div>
    );
  }
  if (isSignedIn && (!user || !role)) {
    return (
      <ApplicationProfileUnavailable
        onRetry={() => void refresh()}
        onSignOut={() => void logout()}
      />
    );
  }
  if (!user || !role) return <AccessPortal />;

  const RoleIcon = roleCopy[role].icon;
  const submitIssue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    reportIssue.mutate(issueForm);
  };
  const submitEvidenceForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitEvidence.mutate({
      ...evidenceForm,
      sourceUrl: evidenceForm.sourceUrl || undefined,
    });
  };

  return (
    <main className="role-console">
      <header className="role-console__header">
        <button type="button" onClick={() => setLocation("/overview")}>
          3D ULPIN · VPM
        </button>
        <div>
          <span>{formatRole(role)} · backend-enforced role</span>
          <b>{user.name || "Authenticated user"}</b>
          <button
            type="button"
            onClick={() => setLocation("/profile-settings")}
            aria-label="Open profile settings"
          >
            <Settings2 size={14} /> Profile settings
          </button>
          <button type="button" onClick={() => logout()} aria-label="Sign out">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <section className="role-console__hero">
        <RoleIcon size={25} />
        <div>
          <span>PROTECTED PLATFORM WORKSPACE</span>
          <h1>{roleCopy[role].label}</h1>
          <p>{roleCopy[role].description}</p>
        </div>
        <Button
          type="button"
          onClick={() => setLocation("/workspace?segment=buildings")}
        >
          Open 3D property explorer <ArrowRight size={15} />
        </Button>
      </section>

      {dashboardSummary.isLoading ? (
        <DashboardWidgetSkeleton />
      ) : (
        <section className="role-console__metrics" aria-label="Platform summary">
          {summaryCards.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <b>{value}</b>
              <small>Platform-derived summary · not a legal register</small>
            </article>
          ))}
        </section>
      )}

      <section className="role-console__grid">
        <article className="role-console__panel role-console__panel--map">
          <span>PUBLIC / SOURCE-BACKED CONTEXT</span>
          <h2>3D property explorer</h2>
          <p>
            Search ULPIN references, building names, and live source footprints
            in the existing Cesium workspace. OSM Tiles remain visual context;
            source and evidence labels govern what is shown.
          </p>
          <div className="role-console__actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/workspace?segment=buildings")}
            >
              Buildings & floors
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/ulpin-registry")}
            >
              ULPIN registry
            </Button>
          </div>
        </article>

        {role === "citizen" && (
          <article className="role-console__panel">
            <span>REPORT AN ISSUE</span>
            <h2>Source-context correction</h2>
            <form className="role-console__form" onSubmit={submitIssue}>
              <Label>
                Record reference
                <Input
                  value={issueForm.recordReference}
                  onChange={event =>
                    setIssueForm(current => ({
                      ...current,
                      recordReference: event.target.value,
                    }))
                  }
                  placeholder="Source ULPIN or footprint identifier"
                />
              </Label>
              <Label>
                Issue category
                <select
                  value={issueForm.category}
                  onChange={event =>
                    setIssueForm(current => ({
                      ...current,
                      category: event.target.value as typeof current.category,
                    }))
                  }
                >
                  <option value="footprint">Incorrect footprint</option>
                  <option value="floor_count">Incorrect floor count</option>
                  <option value="location">Incorrect location</option>
                  <option value="missing_property">Missing property</option>
                  <option value="parcel_boundary">
                    Incorrect parcel boundary
                  </option>
                </select>
              </Label>
              <Label>
                Description
                <Textarea
                  value={issueForm.details}
                  onChange={event =>
                    setIssueForm(current => ({
                      ...current,
                      details: event.target.value,
                    }))
                  }
                  placeholder="Describe the source or map issue. Do not include personal owner information."
                />
              </Label>
              <Button type="submit" disabled={reportIssue.isPending}>
                <FileWarning size={15} /> Submit report
              </Button>
            </form>
          </article>
        )}

        {hasAuthority && (
          <>
            <article className="role-console__panel">
              <span>AUTHORITY EVIDENCE SUBMISSION</span>
              <h2>Submit for review</h2>
              <form
                className="role-console__form"
                onSubmit={submitEvidenceForm}
              >
                <Label>
                  Record reference
                  <Input
                    value={evidenceForm.recordReference}
                    onChange={event =>
                      setEvidenceForm(current => ({
                        ...current,
                        recordReference: event.target.value,
                      }))
                    }
                    placeholder="Source ULPIN or footprint identifier"
                  />
                </Label>
                <Label>
                  Evidence type
                  <select
                    value={evidenceForm.submissionType}
                    onChange={event =>
                      setEvidenceForm(current => ({
                        ...current,
                        submissionType: event.target
                          .value as typeof current.submissionType,
                      }))
                    }
                  >
                    <option value="geometry">Geometry / GeoJSON</option>
                    <option value="height">Measured height</option>
                    <option value="floor_count">Floor count</option>
                    <option value="floor_plan">Approved floor plan</option>
                    <option value="survey">Survey / GNSS</option>
                  </select>
                </Label>
                <Label>
                  Source reference
                  <Input
                    value={evidenceForm.sourceReference}
                    onChange={event =>
                      setEvidenceForm(current => ({
                        ...current,
                        sourceReference: event.target.value,
                      }))
                    }
                    placeholder="Authority document or survey reference"
                  />
                </Label>
                <Label>
                  Source URL (optional)
                  <Input
                    value={evidenceForm.sourceUrl}
                    onChange={event =>
                      setEvidenceForm(current => ({
                        ...current,
                        sourceUrl: event.target.value,
                      }))
                    }
                    placeholder="https://authority.example/document"
                  />
                </Label>
                <Label>
                  Submission note
                  <Textarea
                    value={evidenceForm.notes}
                    onChange={event =>
                      setEvidenceForm(current => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Describe scope, source, and verification limits."
                  />
                </Label>
                <Button type="submit" disabled={submitEvidence.isPending}>
                  Record submission
                </Button>
              </form>
            </article>
            <article className="role-console__panel role-console__panel--wide">
              <span>VERIFICATION QUEUE</span>
              <h2>Evidence remains unverified until reviewed</h2>
              <div className="role-console__queue">
                {verificationQueue.data?.length ? (
                  verificationQueue.data.map(item => (
                    <div key={item.id}>
                      <b>{item.recordReference}</b>
                      <small>
                        {item.submissionType.replaceAll("_", " ")} ·{" "}
                        {item.status.replaceAll("_", " ")}
                      </small>
                      <p>{item.sourceReference}</p>
                      <footer>
                        <button
                          type="button"
                          onClick={() =>
                            reviewEvidence.mutate({
                              id: item.id,
                              status: "under_review",
                              reviewNote:
                                "Review initiated through authority workspace.",
                            })
                          }
                        >
                          Start review
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            reviewEvidence.mutate({
                              id: item.id,
                              status: "rejected",
                              reviewNote:
                                "Rejected pending additional authority evidence.",
                            })
                          }
                        >
                          Reject pending evidence
                        </button>
                      </footer>
                    </div>
                  ))
                ) : (
                  <p>No persisted evidence submissions are awaiting review.</p>
                )}
              </div>
            </article>
          </>
        )}

        {hasGovernment && (
          <article className="role-console__panel role-console__panel--wide">
            <span>GOVERNMENT GIS OPERATIONS</span>
            <h2>Aggregate verification intelligence</h2>
            <p>
              {governmentSummary.data?.records ?? 0} platform source records,{" "}
              {governmentSummary.data?.pendingVerification ?? 0} submissions
              pending review, and{" "}
              {governmentSummary.data?.reviewedVerification ?? 0} reviewed
              workflow records. No personal owner information is included in
              this summary.
            </p>
            <div className="role-console__actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/workspace?segment=buildings")}
              >
                Open source GIS map
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/ulpin-registry")}
              >
                Open registry context
              </Button>
            </div>
          </article>
        )}

        {isAdmin && (
          <>
            <article className="role-console__panel role-console__panel--wide">
              <span>ROLE ADMINISTRATION</span>
              <h2>Backend-enforced account assignment</h2>
              <div className="role-console__user-list">
                {adminUsers.data?.map(account => (
                  <div key={account.clerkUserId}>
                    <span>{account.name || "Unnamed account"}</span>
                    <small>{account.clerkUserId}</small>
                    <select
                      value={account.role}
                      disabled={
                        account.clerkUserId === user.clerkUserId ||
                        assignRole.isPending
                      }
                      onChange={event =>
                        assignRole.mutate({
                          clerkUserId: account.clerkUserId,
                          role: event.target.value as PlatformRole,
                        })
                      }
                    >
                      <option value="citizen">Citizen</option>
                      <option value="authority">Authority</option>
                      <option value="government_employee">
                        Government employee
                      </option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                )) ?? <p>Loading accounts…</p>}
              </div>
            </article>
            <article className="role-console__panel role-console__panel--wide">
              <span>IMMUTABLE AUDIT TRAIL</span>
              <h2>Recent sensitive actions</h2>
              <div className="role-console__audit-list">
                {auditLogs.data?.length ? (
                  auditLogs.data.map(log => (
                    <div key={log.id}>
                      <b>{log.action.replaceAll("_", " ")}</b>
                      <span>
                        {log.entityType} · {log.entityId}
                      </span>
                      <small>
                        {new Date(log.createdAt).toLocaleString()} ·{" "}
                        {formatRole(log.actorRole as PlatformRole)}
                      </small>
                    </div>
                  ))
                ) : (
                  <p>No sensitive platform actions have been recorded yet.</p>
                )}
              </div>
            </article>
          </>
        )}
      </section>
    </main>
  );
}
