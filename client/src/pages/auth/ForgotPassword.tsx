import React, { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Shield,
  Mail,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: (data) => {
      setSubmitted(true);
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
      toast.success("Password reset instructions dispatched.");
    },
    onError: (err) => {
      toast.error(err.message || "Unable to request password reset.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your registered email address.");
      return;
    }
    forgotMutation.mutate({ email: email.trim() });
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6">
          <KeyRound className="w-6 h-6" />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Reset Password
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enter your official email to receive a secure, time-limited password reset link.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-white">Instructions Dispatched</h3>
              <p className="text-xs text-slate-300 mt-1">
                If an account exists for <span className="text-cyan-400 font-semibold">{email}</span>, a secure password reset link has been dispatched (valid for 1 hour).
              </p>
            </div>

            {resetUrl && (
              <div className="rounded-2xl border border-cyan-500/30 bg-slate-950 p-4 text-xs">
                <div className="font-semibold text-cyan-400 mb-1">
                  Local Dev / Staging Direct Link:
                </div>
                <a
                  href={resetUrl}
                  className="text-cyan-300 break-all underline hover:text-cyan-200"
                >
                  {resetUrl}
                </a>
              </div>
            )}

            <div className="text-center">
              <Link
                href="/staff/login"
                className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
              >
                <ArrowLeft size={14} /> Back to Staff Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">
                Official Account Email
              </Label>
              <div className="relative">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gov.in or registered email"
                  required
                  className="bg-slate-950 border-slate-700 text-white pl-10 focus:border-cyan-500"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={forgotMutation.isPending}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-5 rounded-xl shadow-lg shadow-cyan-950/40"
            >
              {forgotMutation.isPending ? "Sending..." : "Send Reset Link"}
            </Button>

            <div className="text-center pt-2">
              <Link
                href="/staff/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                <ArrowLeft size={12} /> Return to Staff Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
