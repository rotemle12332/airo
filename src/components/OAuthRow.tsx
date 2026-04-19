import { toast } from "sonner";
import { useState } from "react";
import { lovable } from "@/integrations/lovable";

type Provider = "google" | "apple" | "facebook";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38Z"
    />
  </svg>
);

const AppleIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    aria-hidden
    className="fill-foreground"
  >
    <path d="M16.36 12.92c-.02-2.5 2.04-3.7 2.13-3.76-1.16-1.7-2.97-1.93-3.61-1.96-1.54-.16-3 .9-3.78.9-.78 0-1.97-.88-3.24-.85-1.67.02-3.21.97-4.07 2.46-1.74 3.01-.44 7.46 1.25 9.91.83 1.2 1.81 2.55 3.1 2.5 1.25-.05 1.72-.81 3.23-.81s1.93.81 3.25.78c1.34-.02 2.19-1.22 3.01-2.43.95-1.39 1.34-2.74 1.36-2.81-.03-.01-2.6-1-2.63-3.93ZM13.93 4.6c.69-.84 1.16-2.02 1.03-3.18-1 .04-2.21.66-2.92 1.5-.64.74-1.2 1.93-1.05 3.07 1.11.09 2.25-.56 2.94-1.39Z" />
  </svg>
);

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="#1877F2"
      d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88V14.9H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.9h-2.33v6.98C18.34 21.13 22 16.99 22 12Z"
    />
  </svg>
);

export function OAuthRow({ disabled }: { disabled?: boolean }) {
  const [busy, setBusy] = useState<Provider | null>(null);

  const handle = async (provider: Provider) => {
    if (provider === "facebook") {
      toast.info("Facebook sign-in is coming soon — use Google or Apple for now.");
      return;
    }
    setBusy(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Sign-in failed");
        setBusy(null);
        return;
      }
      // If redirected:true the browser leaves; otherwise session set, route guard handles redirect.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
      setBusy(null);
    }
  };

  const btn =
    "h-12 flex-1 inline-flex items-center justify-center rounded-2xl border border-border/60 bg-card hover:bg-surface transition disabled:opacity-50";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Continue with Google"
        disabled={disabled || busy !== null}
        onClick={() => handle("google")}
        className={btn}
      >
        {busy === "google" ? (
          <span className="text-xs text-muted-foreground">…</span>
        ) : (
          <GoogleIcon />
        )}
      </button>
      <button
        type="button"
        aria-label="Continue with Apple"
        disabled={disabled || busy !== null}
        onClick={() => handle("apple")}
        className={btn}
      >
        {busy === "apple" ? (
          <span className="text-xs text-muted-foreground">…</span>
        ) : (
          <AppleIcon />
        )}
      </button>
      <button
        type="button"
        aria-label="Continue with Facebook"
        disabled={disabled || busy !== null}
        onClick={() => handle("facebook")}
        className={btn}
      >
        <FacebookIcon />
      </button>
    </div>
  );
}
