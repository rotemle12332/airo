import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { OAuthRow } from "@/components/OAuthRow";
import { LangToggle } from "@/components/LangToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import ambientSunset from "@/assets/ambient-sunset.jpg";

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
    if (user) navigate({ to: (search.redirect as "/") ?? "/" });
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: (search.redirect as "/") ?? "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
      {/* Ambient sunset background */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${ambientSunset})` }}
      />
      <div aria-hidden className="absolute inset-0 z-0 bg-black/15 backdrop-blur-[3px] dark:bg-black/45" />

      {/* Top toolbar */}
      <header className="absolute inset-x-0 top-0 z-20 mx-auto flex h-16 w-full max-w-[460px] items-center justify-between px-5">
        <Link
          to="/"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/30 text-foreground backdrop-blur-md hover:bg-white/50"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Link>
        <div className="flex items-center gap-1 rounded-full border border-white/40 bg-white/30 px-1 py-1 backdrop-blur-md">
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-[420px] px-5 py-10 airo-rise">
        <div className="airo-glass-strong rounded-[28px] p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6 flex flex-col items-center text-center">
            <h2 className="font-serif-display text-3xl font-bold italic tracking-tighter text-primary">
              Airo
            </h2>
            <h1 className="mt-3 font-serif-display text-2xl font-semibold text-foreground">
              {isSignup ? t("auth.createAccount") : t("auth.welcomeBack")}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isSignup ? t("auth.startJourney") : t("auth.continueJourney")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4">
            {isSignup ? (
              <Field
                label={t("auth.fullName")}
                placeholder="Jane Doe"
                type="text"
                value={displayName}
                onChange={setDisplayName}
                autoComplete="name"
              />
            ) : null}

            <Field
              label={t("auth.emailAddress")}
              placeholder="name@example.com"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />

            <Field
              label={t("auth.password")}
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={6}
              required
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-muted-foreground transition hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              trailingLink={
                !isSignup ? (
                  <button
                    type="button"
                    onClick={() => toast.info("Password reset is coming soon.")}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                ) : null
              }
            />

            <button
              type="submit"
              disabled={submitting}
              className="relative mt-2 w-full overflow-hidden rounded-full bg-primary px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground shadow-[0_8px_20px_-4px_color-mix(in_oklab,var(--color-primary)_55%,transparent)] transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-60 airo-button-shimmer airo-press-deep airo-glow-hover"
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 to-transparent" />
              {submitting
                ? t("common.loading") + "…"
                : isSignup
                  ? t("auth.createAccountCta")
                  : t("auth.logIn")}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border/60" />
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t("auth.orContinueWith")}
            </span>
            <span className="h-px flex-1 bg-border/60" />
          </div>

          <OAuthRow disabled={submitting} />

          {/* Switch */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
            <button
              type="button"
              onClick={() => setMode(isSignup ? "signin" : "signup")}
              className="font-semibold text-primary hover:underline"
            >
              {isSignup ? t("auth.logIn") : t("auth.signUp")}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  rightSlot,
  trailingLink,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rightSlot?: React.ReactNode;
  trailingLink?: React.ReactNode;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div className="space-y-1.5">
      <div className="ms-2 flex items-center justify-between">
        <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </label>
        {trailingLink}
      </div>
      <div className="relative">
        <input
          {...rest}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full rounded-xl border border-border/60 bg-card/70 px-4 text-sm text-foreground placeholder:text-muted-foreground/70 backdrop-blur-md transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
        />
        {rightSlot ? (
          <span className="absolute end-3 top-1/2 -translate-y-1/2">{rightSlot}</span>
        ) : null}
      </div>
    </div>
  );
}
