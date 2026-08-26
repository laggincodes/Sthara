import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { useClerk, useUser } from "@clerk/react";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Moon,
  Save,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type ProfilePreferences = {
  reduceMotion: boolean;
};

function preferencesKey(clerkUserId: string) {
  return `ulpin:profile-preferences:${clerkUserId}`;
}

function splitDisplayName(fullName?: string | null) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

function ProfileSettingsSkeleton() {
  return (
    <main className="profile-settings profile-settings--loading" aria-busy="true">
      <div className="profile-settings__shell">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-80 max-w-full" />
        <Skeleton className="h-5 w-full max-w-2xl" />
        <section className="profile-settings__card">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </section>
      </div>
    </main>
  );
}

export default function ProfileSettings() {
  const [, setLocation] = useLocation();
  const { user: applicationUser, isSignedIn, loading, refresh } = useAuth();
  const { user: clerkUser, isLoaded } = useUser();
  const clerk = useClerk();
  const { theme, toggleTheme } = useTheme();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferences, setPreferences] = useState<ProfilePreferences>({
    reduceMotion: false,
  });
  const [saving, setSaving] = useState(false);

  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? "Email not available";
  const roleLabel = applicationUser?.role.replaceAll("_", " ") ?? "profile pending";
  const fallbackName = useMemo(
    () => splitDisplayName(clerkUser?.fullName),
    [clerkUser?.fullName]
  );

  useEffect(() => {
    if (!clerkUser) return;
    setFirstName(clerkUser.firstName ?? fallbackName.firstName);
    setLastName(clerkUser.lastName ?? fallbackName.lastName);
    try {
      const saved = window.localStorage.getItem(preferencesKey(clerkUser.id));
      if (saved) {
        setPreferences({ reduceMotion: Boolean(JSON.parse(saved).reduceMotion) });
      }
    } catch {
      setPreferences({ reduceMotion: false });
    }
  }, [clerkUser, fallbackName]);

  useEffect(() => {
    document.documentElement.dataset.ulpinMotion = preferences.reduceMotion
      ? "reduced"
      : "standard";
  }, [preferences.reduceMotion]);

  useEffect(() => {
    if (!loading && isLoaded && !isSignedIn) {
      setLocation("/access?returnTo=/profile-settings");
    }
  }, [isLoaded, isSignedIn, loading, setLocation]);

  if (loading || !isLoaded) return <ProfileSettingsSkeleton />;

  if (!isSignedIn || !clerkUser) return <ProfileSettingsSkeleton />;

  if (!applicationUser) {
    return (
      <main className="profile-settings profile-settings--loading">
        <div className="profile-settings__shell profile-settings__empty">
          <ShieldCheck size={26} />
          <p>SECURE SESSION CONFIRMED</p>
          <h1>Preparing your application profile</h1>
          <span>
            Your Clerk identity is valid. The backend must load your
            server-assigned application profile before settings are available.
          </span>
          <Button type="button" onClick={() => void refresh()}>
            Retry profile connection
          </Button>
        </div>
      </main>
    );
  }

  const saveProfile = async () => {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    if (!normalizedFirstName) {
      toast.error("A given name is required");
      return;
    }

    setSaving(true);
    try {
      await clerkUser.update({
        firstName: normalizedFirstName,
        lastName: normalizedLastName || null,
      });
      window.localStorage.setItem(
        preferencesKey(clerkUser.id),
        JSON.stringify(preferences)
      );
      await refresh();
      toast.success("Profile settings saved", {
        description:
          "Personal information is updated through Clerk. Your application role remains server-assigned.",
      });
    } catch (error) {
      toast.error("Profile update could not be saved", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again or use the secure Clerk account manager.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="profile-settings">
      <div className="profile-settings__shell">
        <button
          className="profile-settings__back"
          type="button"
          onClick={() => setLocation("/dashboard")}
        >
          <ArrowLeft size={16} /> Dashboard
        </button>
        <span className="profile-settings__eyebrow">ACCOUNT & PREFERENCES</span>
        <h1>Profile settings</h1>
        <p className="profile-settings__intro">
          Manage Clerk-hosted personal information and this device’s dashboard
          preferences. Application access remains server-controlled.
        </p>

        <div className="profile-settings__grid">
          <section className="profile-settings__card" aria-labelledby="personal-information-title">
            <div className="profile-settings__card-heading">
              <UserRound size={19} />
              <div>
                <span>CLERK-MANAGED IDENTITY</span>
                <h2 id="personal-information-title">Personal information</h2>
              </div>
            </div>
            <div className="profile-settings__fields">
              <Label>
                Given name
                <Input
                  value={firstName}
                  onChange={event => setFirstName(event.target.value)}
                  autoComplete="given-name"
                />
              </Label>
              <Label>
                Family name
                <Input
                  value={lastName}
                  onChange={event => setLastName(event.target.value)}
                  autoComplete="family-name"
                />
              </Label>
              <Label className="profile-settings__readonly-field">
                Primary email
                <Input value={email} readOnly aria-readonly="true" />
                <small>Managed securely by Clerk.</small>
              </Label>
            </div>
            <div className="profile-settings__actions">
              <Button type="button" onClick={() => void saveProfile()} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                Save personal information
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => clerk.openUserProfile()}
              >
                <ExternalLink /> Manage email & security
              </Button>
            </div>
          </section>

          <section className="profile-settings__card" aria-labelledby="preferences-title">
            <div className="profile-settings__card-heading">
              <Sun size={19} />
              <div>
                <span>THIS DEVICE</span>
                <h2 id="preferences-title">Dashboard preferences</h2>
              </div>
            </div>
            <div className="profile-settings__preference-row">
              <div>
                <b>{theme === "dark" ? "Dark appearance" : "Light appearance"}</b>
                <span>Use the current dashboard color scheme on this device.</span>
              </div>
              <Button type="button" variant="outline" onClick={toggleTheme}>
                {theme === "dark" ? <Sun /> : <Moon />}
                Switch to {theme === "dark" ? "light" : "dark"}
              </Button>
            </div>
            <div className="profile-settings__preference-row">
              <div>
                <b>Reduce non-essential motion</b>
                <span>Minimise interface motion while retaining feedback and focus states.</span>
              </div>
              <Switch
                checked={preferences.reduceMotion}
                onCheckedChange={checked =>
                  setPreferences(current => ({ ...current, reduceMotion: checked }))
                }
                aria-label="Reduce non-essential motion"
              />
            </div>
          </section>

          <section className="profile-settings__card profile-settings__card--role" aria-labelledby="access-title">
            <div className="profile-settings__card-heading">
              <ShieldCheck size={19} />
              <div>
                <span>SERVER-ASSIGNED ACCESS</span>
                <h2 id="access-title">Your application role</h2>
              </div>
            </div>
            <strong>{roleLabel}</strong>
            <p>
              New accounts start as Citizens. Authority, Government Employee,
              and Administrator access can only be assigned by an authorized
              Administrator through the backend. This page cannot change roles.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
