import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Building2,
  MapPin,
  Briefcase,
  AlertCircle,
  Clock,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AcceptInvitation() {
  const [, setLocation] = useLocation();

  // Extract token from query params
  const [token, setToken] = useState<string>("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || "";
    setToken(t);
  }, []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  // Real-time verification query
  const verifyQuery = trpc.auth.verifyInvitationToken.useQuery(
    { token },
    {
      enabled: Boolean(token),
      retry: false,
    }
  );

  const acceptMutation = trpc.auth.acceptInvitation.useMutation({
    onSuccess: () => {
      setIsActivated(true);
      toast.success("Account activated successfully! Please sign in.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to activate account. Please check your credentials.");
    },
  });

  // Password validation criteria
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const isPasswordValid =
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecial &&
    passwordsMatch;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Invitation token is missing.");
      return;
    }
    if (!isPasswordValid) {
      toast.error("Please meet all password security requirements before submitting.");
      return;
    }

    acceptMutation.mutate({
      token,
      password,
      confirmPassword,
    });
  };

  // 1. Loading State
  if (!token || verifyQuery.isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-200">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center animate-pulse text-cyan-400">
            <KeyRound className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-sm text-slate-400 font-medium">
            Verifying cryptographic invitation token...
          </p>
        </div>
      </main>
    );
  }

  // 2. Token Verification Failed / Invalid State
  if (verifyQuery.isError || (verifyQuery.data && !verifyQuery.data.valid)) {
    const errorType =
      verifyQuery.data && !verifyQuery.data.valid
        ? verifyQuery.data.errorType
        : "INVALID";
    const errorMessage =
      verifyQuery.data && !verifyQuery.data.valid
        ? verifyQuery.data.message
        : "The invitation token is invalid or expired.";

    const errorDetails: Record<
      string,
      { badge: string; color: string; desc: string }
    > = {
      EXPIRED: {
        badge: "INVITATION EXPIRED",
        color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
        desc: "This invitation link has passed its 48-hour expiration window. Please contact your system administrator to receive a fresh activation link.",
      },
      ALREADY_USED: {
        badge: "ALREADY ACTIVATED",
        color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
        desc: "This invitation has already been accepted and your password has been configured. You can sign in directly with your email and password.",
      },
      REVOKED: {
        badge: "INVITATION REVOKED",
        color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
        desc: "This invitation token was revoked by an administrator. Please reach out to your department supervisor.",
      },
      INVALID: {
        badge: "INVALID TOKEN",
        color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
        desc: "The invitation link provided is malformed or does not exist in the national registry.",
      },
    };

    const details = errorDetails[errorType] || errorDetails.INVALID;

    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-6">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${details.color} mb-4`}
          >
            {details.badge}
          </div>

          <h1 className="text-xl font-bold text-white mb-2">
            Unable to Proceed with Activation
          </h1>
          <p className="text-sm text-slate-300 mb-4">{errorMessage}</p>
          <p className="text-xs text-slate-400 leading-relaxed mb-8 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            {details.desc}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => setLocation("/staff/login")}
              className="border-slate-700 hover:bg-slate-800 text-slate-200"
            >
              Go to Staff Login
            </Button>
            <Button
              onClick={() => setLocation("/login")}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              Citizen / Public Login
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // 3. Post-Activation Success Screen (Zero Auto-Login)
  if (isActivated) {
    const invite = verifyQuery.data?.valid ? verifyQuery.data.invitation : null;
    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl border border-emerald-500/30 bg-slate-900/95 p-8 shadow-2xl backdrop-blur text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 mb-4">
            <CheckCircle2 size={14} /> ACCOUNT ACTIVATED SUCCESSFULLY
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2">
            Welcome to the 3D ULPIN Platform
          </h1>

          <p className="text-sm text-slate-300 mb-6">
            Your official account for{" "}
            <span className="font-semibold text-cyan-400">{invite?.email}</span> has been
            activated with the role of{" "}
            <span className="font-semibold text-white">{invite?.roleTitle}</span>.
          </p>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left text-xs space-y-2 mb-8 text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Security Invariant:</span>
              <span className="text-emerald-400 font-medium">Zero Auto-Login Policy</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal pt-1 border-t border-slate-800/80">
              For security compliance, invitation acceptance does not initiate a session.
              Please sign in using your newly created password.
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => setLocation("/staff/login")}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-6 text-base rounded-xl shadow-lg shadow-cyan-950/50"
          >
            Go to Staff Login <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </main>
    );
  }

  // 4. Main Password Setup Form
  const invite = verifyQuery.data?.valid ? verifyQuery.data.invitation : null;

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur overflow-hidden">
        {/* Left Column: Official Invitation Context */}
        <section className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
              <Shield size={14} /> OFFICIAL ACCOUNT ACTIVATION
            </div>

            <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-white">
              Activate Official Identity
            </h1>
            <p className="mt-1 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              Department of Land Resources · DoLR
            </p>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2.5 text-xs">
                <div>
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                    Invited Official
                  </div>
                  <div className="font-semibold text-white text-sm mt-0.5">
                    {invite?.name || "Official Staff Member"}
                  </div>
                  <div className="text-cyan-400 text-xs font-mono">{invite?.email}</div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                    Assigned Role
                  </div>
                  <div className="inline-flex items-center gap-1.5 mt-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-300">
                    <ShieldCheck size={12} /> {invite?.roleTitle}
                  </div>
                </div>

                {invite?.departmentName && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-slate-300">
                    <Building2 size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                    <span>{invite.departmentName}</span>
                  </div>
                )}

                {invite?.districtName && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin size={14} className="text-amber-400 shrink-0" />
                    <span>District: {invite.districtName}</span>
                  </div>
                )}

                {invite?.designation && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Briefcase size={14} className="text-purple-400 shrink-0" />
                    <span>{invite.designation}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Clock size={12} /> Single-use cryptographic token
            </span>
            <span className="text-cyan-400">SIH 2026</span>
          </div>
        </section>

        {/* Right Column: Password Creation Form */}
        <section className="lg:col-span-7 p-8 lg:p-10 flex flex-col justify-center bg-slate-900/40">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Create Your Security Credentials
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Set a strong password to complete your account setup and activate platform access.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password Field */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">
                New Password
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a strong password"
                  required
                  className="bg-slate-950 border-slate-700 text-white pr-10 focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  className="bg-slate-950 border-slate-700 text-white pr-10 focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Security Requirements Checklist */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={12} className="text-cyan-400" /> Password Security Guidelines
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                <div
                  className={`flex items-center gap-2 ${
                    hasMinLength ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {hasMinLength ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span>Min 8 characters</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    hasUppercase ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {hasUppercase ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span>1 Uppercase (A-Z)</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    hasLowercase ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {hasLowercase ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span>1 Lowercase (a-z)</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    hasNumber ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {hasNumber ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span>1 Number (0-9)</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    hasSpecial ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {hasSpecial ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span>1 Special character</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    passwordsMatch ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {passwordsMatch ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span>Passwords match</span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={!isPasswordValid || acceptMutation.isPending}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold py-5 rounded-xl shadow-lg shadow-cyan-950/40 mt-4"
            >
              {acceptMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Activating Account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShieldCheck size={18} /> Activate Account & Set Password
                </span>
              )}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
