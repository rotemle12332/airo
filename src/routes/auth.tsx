import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, User as UserIcon, ArrowLeft } from "lucide-react";
import { AiroLogo } from "@/components/AiroLogo";
import { OAuthRow } from "@/components/OAuthRow";
import { Button } from "@/components/ui/button";
import { LangToggle } from "@/components/LangToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate({ to: (search.redirect as "/") ?? "/" });
    }
  }, [user, navigate, search.redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created — welcome to Airo");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      navigate({ to: (search.redirect as "/") ?? "/" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Subtle aurora glow background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-40"
        style={{
          background:
            "radial-gradient(60% 40% at 50% 0%, color-mix(in oklab, var(--color-primary) 18%, transparent) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full opacity-30 dark:opacity-20"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--color-primary-glow) 35%, transparent), transparent)",
          filter: "blur(40px)",
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex h-16 w-full max-w-md items-center justify-between px-6">
        {isSignup ? (
          <span className="h-9 w-9" />
        ) : (
          <Link
            to="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card hover:bg-surface"
            aria-label={t("common.back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        <div className="flex items-center gap-1">
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center px-6 pb-16 pt-6">
        {/* Brand */}
        <AiroLogo size={56} withTagline />

        {/* Title */}
        <h1 className="mt-10 text-2xl font-semibold tracking-tight text-foreground">
          {isSignup ? t("auth.createAccount") : t("auth.welcomeBack")}
        </h1>
        <p className="mt-1.5 text-center text-sm text-muted-foreground">
          {isSignup ? t("auth.startJourney") : t("auth.continueJourney")}
        </p>

        {/* Form */}
        <form onSubmit={submit} className="mt-8 w-full space-y-3">
          {isSignup ? (
            <FieldInput
              icon={<UserIcon className="h-4 w-4" />}
              type="text"
              placeholder={t("auth.fullName")}
              value={displayName}
              onChange={setDisplayName}
              autoComplete="name"
            />
          ) : null}

          <FieldInput
            icon={<Mail className="h-4 w-4" />}
            type="email"
            placeholder={t("auth.emailAddress")}
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />

          <div className="relative">
            <FieldInput
              icon={<Lock className="h-4 w-4" />}
              type={showPassword ? "text" : "password"}
              placeholder={isSignup ? t("auth.createPassword") : t("auth.password")}
              value={password}
              onChange={setPassword}
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute end-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {!isSignup ? (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => toast.info("Password reset is coming soon.")}
              >
                {t("auth.forgotPassword")}
              </button>
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={submitting}
            className="mt-2 h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting
              ? t("common.loading") + "…"
              : isSignup
                ? t("auth.createAccountCta")
                : t("auth.logIn")}
          </Button>

          {/* Divider */}
          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs text-muted-foreground">
                {t("auth.orContinueWith")}
              </span>
            </div>
          </div>

          <OAuthRow disabled={submitting} />
        </form>

        {/* Switch mode */}
        <p className="mt-8 text-sm text-muted-foreground">
          {isSignup ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
          <button
            type="button"
            onClick={() => setMode(isSignup ? "signin" : "signup")}
            className="font-semibold text-primary hover:underline"
          >
            {isSignup ? t("auth.logIn") : t("auth.signUp")}
          </button>
        </p>
      </main>
    </div>
  );
}

function FieldInput({
  icon,
  value,
  onChange,
  ...rest
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-full rounded-2xl border border-border/60 bg-card ps-11 pe-4 text-sm text-foreground placeholder:text-muted-foreground/80 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}
