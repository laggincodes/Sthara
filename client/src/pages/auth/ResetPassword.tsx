import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
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
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
  }, []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const verifyQuery = trpc.auth.verifyResetToken.useQuery(
    { token },
    {
      enabled: Boolean(token),
      retry: false,
    }
  );

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setIsSuccess(true);
      toast.success("Password reset successfully! Please sign in.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to reset password.");
    },
  });

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
      toast.error("Password reset token is missing.");
      return;
    }
    if (!isPasswordValid) {
      toast.error("Please meet all password security requirements.");
      return;
    }

    resetMutation.mutate({
      token,
      password,
      confirmPassword,
    });
  };

  if (!token || verifyQuery.isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-200">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center animate-pulse text-cyan-400">
            <KeyRound className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-sm text-slate-400 font-medium">
            Verifying password reset token...
          </p>
        </div>
      </main>
    );
  }

  if (verifyQuery.isError || (verifyQuery.data && !verifyQuery.data.valid)) {
    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-6">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Invalid or Expired Link</h1>
          <p className="text-xs text-slate-400 mb-6">
            {verifyQuery.data?.message || "This password reset token is invalid or has expired."}
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setLocation("/forgot-password")}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              Request New Reset Link
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/staff/login")}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-emerald-500/30 bg-slate-900/90 p-8 shadow-2xl backdrop-blur text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Password Reset Complete</h1>
          <p className="text-xs text-slate-300 mb-6">
            Your password has been successfully updated. You may now log in with your new credentials.
          </p>
          <Button
            onClick={() => setLocation("/staff/login")}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-5 font-semibold rounded-xl"
          >
            Go to Staff Login <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6">
          <Lock className="w-6 h-6" />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Create New Password
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Setting new credentials for{" "}
            <span className="text-cyan-400 font-semibold">
              {verifyQuery.data?.email}
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300">New Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
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

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
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

          {/* Checklist */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-1.5 text-xs">
            <div
              className={`flex items-center gap-2 ${
                hasMinLength ? "text-emerald-400" : "text-slate-500"
              }`}
            >
              {hasMinLength ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              <span>Min 8 characters</span>
            </div>
            <div
              className={`flex items-center gap-2 ${
                hasUppercase && hasLowercase ? "text-emerald-400" : "text-slate-500"
              }`}
            >
              {hasUppercase && hasLowercase ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              <span>Upper & Lowercase letters</span>
            </div>
            <div
              className={`flex items-center gap-2 ${
                hasNumber && hasSpecial ? "text-emerald-400" : "text-slate-500"
              }`}
            >
              {hasNumber && hasSpecial ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              <span>Number & Special character</span>
            </div>
            <div
              className={`flex items-center gap-2 ${
                passwordsMatch ? "text-emerald-400" : "text-slate-500"
              }`}
            >
              {passwordsMatch ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              <span>Passwords match</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!isPasswordValid || resetMutation.isPending}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold py-5 rounded-xl shadow-lg shadow-cyan-950/40"
          >
            {resetMutation.isPending ? "Resetting Password..." : "Set New Password"}
          </Button>
        </form>
      </div>
    </main>
  );
}
