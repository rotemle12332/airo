import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Bell } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AiroLogo } from "@/components/AiroLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import heroLuggage from "@/assets/airo-hero-luggage.png";

type Trip = Database["public"]["Tables"]["trips"]["Row"];

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setTrips([]);
      return;
    }
    setTripsLoading(true);
    supabase
      .from("trips")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTrips((data ?? []) as Trip[]);
        setTripsLoading(false);
      });
  }, [user]);

  const launch = () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/trip/new" } });
    } else {
      navigate({ to: "/trip/new" });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Aurora glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-60 dark:opacity-30"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--color-primary) 22%, transparent) 0%, transparent 75%)",
        }}
      />

      <AppHeader />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-32 pt-6 sm:pt-12">
        {/* Hero */}
        <section className="mx-auto max-w-3xl text-center">
          <div className="flex justify-end sm:hidden">
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card hover:bg-surface"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>

          <div className="mx-auto inline-flex flex-col items-center">
            <AiroLogo size={64} withTagline />
          </div>

          {/* Hero illustration */}
          <div className="mx-auto mt-6 max-w-sm">
            <img
              src={heroLuggage}
              alt="Airo travel companion illustration"
              width={1024}
              height={1024}
              className="mx-auto h-auto w-full max-w-[280px] drop-shadow-xl"
            />
          </div>

          <p className="mx-auto mt-4 max-w-md text-balance text-sm text-muted-foreground">
            {loading ? "" : user ? t("home.noTrips") : t("auth.subtitle")}
          </p>

          <div className="mt-8 flex items-center justify-center">
            <Button
              size="lg"
              onClick={launch}
              className="h-14 rounded-2xl bg-primary px-10 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:bg-primary/90"
            >
              <Plus className="me-1 h-5 w-5" />
              {t("home.launch")}
            </Button>
          </div>
        </section>

        {/* Past trips */}
        {user && trips.length > 0 ? (
          <section className="mt-20">
            <div className="mb-5 flex items-end justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                {t("home.pastTrips")}
              </h2>
              <button className="rounded-full border border-border/60 bg-card px-4 py-1.5 text-xs font-medium hover:bg-surface">
                View All
              </button>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => (
                <Link
                  key={trip.id}
                  to="/trip/$tripId/plan"
                  params={{ tripId: trip.id }}
                  className="group relative aspect-[4/3] overflow-hidden rounded-3xl border border-border/50 bg-card transition-all hover:scale-[1.02]"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{
                      backgroundImage: trip.cover_image_url
                        ? `url(${trip.cover_image_url})`
                        : "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-glow) 100%)",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <h3 className="font-serif-display text-xl font-semibold">
                      {trip.title}
                    </h3>
                    {trip.start_date && (
                      <p className="mt-1 text-xs text-white/80">
                        {new Date(trip.start_date).toLocaleDateString(undefined, {
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {user && tripsLoading ? (
          <div className="mt-16 text-center text-sm text-muted-foreground">
            {t("common.loading")}…
          </div>
        ) : null}
      </main>
    </div>
  );
}
