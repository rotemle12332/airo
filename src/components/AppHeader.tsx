import { Link } from "@tanstack/react-router";
import { AiroLogo } from "./AiroLogo";
import { ThemeToggle } from "./ThemeToggle";
import { LangToggle } from "./LangToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-background/70 border-b border-border/50">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link to="/" className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <AiroLogo size={26} />
        </Link>
        <div className="flex items-center gap-1">
          <LangToggle />
          <ThemeToggle />
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="rounded-full"
            >
              {t("home.signOut")}
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link to="/auth">{t("home.signIn")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
