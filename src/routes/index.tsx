import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Star, CalendarDays, Heart, Plane } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import ambientCoast from "@/assets/ambient-coast.jpg";

type Trip = Database["public"]["Tables"]["trips"]["Row"];

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { user, loading } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    if (!user) {
      setTrips([]);
      return;
    }
    supabase
      .from("trips")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setTrips((data ?? []) as Trip[]));
  }, [user]);

  const launch = () => {
    if (!user) navigate({ to: "/auth", search: { redirect: "/trip/new" } });
    else navigate({ to: "/trip/new" });
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Ambient coastal background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <img
          src={ambientCoast}
          alt=""
          className="h-full w-full object-cover opacity-60 dark:opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/65 to-background" />
      </div>

      <div className="relative z-10">
        <AppHeader />

        <main className="mx-auto w-full max-w-6xl px-5 pb-32 pt-10 sm:pt-16">
          {/* Hero */}
          <section className="mx-auto max-w-2xl text-center">
            <h1 className="font-serif-display text-4xl font-bold leading-[1.1] tracking-tight text-foreground drop-shadow-sm sm:text-5xl md:text-6xl airo-rise">
              {lang === "he" ? (
                <>תכנון נסיעות חכם<br />ללא מאמץ</>
              ) : (
                <>Effortless AI Travel<br />Engineering</>
              )}
            </h1>
            <p className="mx-auto mt-5 max-w-md text-balance text-base text-muted-foreground sm:text-lg">
              {lang === "he"
                ? "אוצרות חכמה למסע הבא שלכם."
                : "Intelligent curation for your next extraordinary escape."}
            </p>

            {/* Primary FAB pill */}
            <div className="mt-10 flex justify-center">
              <button
                onClick={launch}
                className="group relative flex h-20 w-72 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground shadow-[0_12px_28px_-8px_color-mix(in_oklab,var(--color-primary)_55%,transparent)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-8px_color-mix(in_oklab,var(--color-primary)_65%,transparent)] active:scale-[0.97] airo-pulse-glow"
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                <Plus className="me-3 h-7 w-7 transition-transform duration-500 group-hover:rotate-90" strokeWidth={1.5} />
                <span className="text-sm font-semibold uppercase tracking-[0.18em]">
                  {t("home.launch")}
                </span>
              </button>
            </div>

            {loading ? null : !user ? (
              <p className="mt-6 text-sm text-muted-foreground">
                {t("auth.subtitle")}
              </p>
            ) : null}
          </section>

          {/* Past Journeys */}
          {user && trips.length > 0 ? (
            <section className="mt-24">
              <div className="mb-6 flex items-end justify-between px-1">
                <h2 className="font-serif-display text-2xl font-semibold text-foreground sm:text-3xl">
                  {t("home.pastTrips")}
                </h2>
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                  {trips.length}
                </span>
              </div>

              <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-6 pt-2">
                {trips.map((trip) => (
                  <Link
                    key={trip.id}
                    to="/trip/$tripId/plan"
                    params={{ tripId: trip.id }}
                    className="group relative h-[380px] w-72 shrink-0 snap-center cursor-pointer overflow-hidden rounded-3xl border border-border/40 airo-glass airo-magnet"
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{
                        backgroundImage: trip.cover_image_url
                          ? `url(${trip.cover_image_url})`
                          : "linear-gradient(135deg, var(--color-primary), var(--color-tertiary))",
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                    <div className="absolute end-4 top-4 flex items-center gap-1 rounded-full border border-white/30 bg-white/20 px-3 py-1 backdrop-blur-md">
                      <Heart className="h-3.5 w-3.5 text-white" fill="currentColor" />
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      {trip.origin ? (
                        <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-white/85">
                          {trip.origin}
                        </span>
                      ) : null}
                      <h3 className="font-serif-display text-2xl font-semibold drop-shadow-md">
                        {trip.title}
                      </h3>
                      {trip.start_date ? (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-white/75">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {new Date(trip.start_date).toLocaleDateString(
                            lang === "he" ? "he-IL" : "en-US",
                            { month: "short", year: "numeric" },
                          )}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                ))}
                <div className="h-[380px] w-2 shrink-0 snap-center" />
              </div>
            </section>
          ) : user ? (
            <p className="mt-16 text-center text-sm text-muted-foreground">
              {t("home.noTrips")}
            </p>
          ) : null}
        </main>
      </div>
    </div>
  );
}
