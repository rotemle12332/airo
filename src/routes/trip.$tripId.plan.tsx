import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Trash2, ExternalLink, Wand2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { StageProgress, type Stage } from "@/components/StageProgress";
import { LiveTotal } from "@/components/LiveTotal";
import { OptionCard, type AiroOption } from "@/components/OptionCard";
import { AiroDrawer } from "@/components/AiroDrawer";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useLocalAgent } from "@/hooks/useLocalAgent";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { AiroPreferences } from "./trip.new";

type Trip = Database["public"]["Tables"]["trips"]["Row"];
type TripItem = Database["public"]["Tables"]["trip_items"]["Row"];

export const Route = createFileRoute("/trip/$tripId/plan")({
  component: PlanPage,
});

const STAGE_HERO: Record<Stage, string> = {
  flights:
    "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?auto=format&fit=crop&w=1600&q=80",
  hotels:
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80",
  attractions:
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80",
};
function stageHeroFor(stage: Stage, _destination?: string) {
  return STAGE_HERO[stage];
}


function PlanPage() {
  const { tripId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [items, setItems] = useState<TripItem[]>([]);
  const [stage, setStage] = useState<Stage>("flights");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [optionsByStage, setOptionsByStage] = useState<Record<Stage, AiroOption[]>>({
    flights: [],
    hotels: [],
    attractions: [],
  });
  const [preferences, setPreferences] = useState<AiroPreferences | null>(null);
  const autoFetchedRef = useRef<Record<Stage, boolean>>({
    flights: false,
    hotels: false,
    attractions: false,
  });

  // Load preferences from sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(`airo:prefs:${tripId}`);
    if (raw) {
      try {
        setPreferences(JSON.parse(raw) as AiroPreferences);
      } catch {
        /* ignore */
      }
    }
  }, [tripId]);

  useEffect(() => {
    if (!authLoading && !user && typeof window !== "undefined") {
      navigate({ to: "/auth", search: { redirect: `/trip/${tripId}/plan` } });
    }
  }, [authLoading, user, tripId, navigate]);

  useEffect(() => {
    if (!user) return;
    void Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).single(),
      supabase.from("trip_items").select("*").eq("trip_id", tripId).order("sort_order"),
    ]).then(([tripRes, itemsRes]) => {
      if (tripRes.data) setTrip(tripRes.data as Trip);
      if (itemsRes.data) setItems(itemsRes.data as TripItem[]);
    });
  }, [user, tripId]);

  const stageItems = items.filter((i) => i.type === stageToType(stage));
  const total = items.reduce((sum, i) => sum + Number(i.price), 0);
  const currency = items[0]?.currency ?? "USD";
  const options = optionsByStage[stage];

  // On-device AI agent (replaces edge function calls).
  const localAgent = useLocalAgent(DEFAULT_LOCAL_MODEL);

  const requestSuggestions = async (
    input: { text: string; imageDataUrl?: string },
    _auto = false,
  ) => {
    if (!localAgent.isReady) {
      toast.info("Activate the on-device AI first");
      return;
    }
    if (input.imageDataUrl) {
      // Image input is not supported by the small on-device model — let the
      // user know but still continue with the text portion.
      toast.message("Image input is ignored on the on-device model — using your text only.");
    }
    setThinking(true);
    setOptionsByStage((prev) => ({ ...prev, [stage]: [] }));
    try {
      const opts = await localAgent.generate({
        stage,
        text: input.text,
        trip: {
          origin: trip?.origin,
          destination: preferences?.destination,
          start_date: trip?.start_date,
          end_date: trip?.end_date,
          traveler_count: trip?.traveler_count,
        },
        preferences: {
          styles: preferences?.styles,
          vibe: preferences?.vibe,
          companion: preferences?.companion,
          with_kids: preferences?.with_kids,
          group_size: preferences?.group_size ?? trip?.traveler_count ?? 1,
          notes: preferences?.notes,
          budget_min: preferences?.budget_min,
          budget_max: preferences?.budget_max,
        },
      });
      setOptionsByStage((prev) => ({
        ...prev,
        [stage]: opts as AiroOption[],
      }));
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "On-device AI failed");
    } finally {
      setThinking(false);
    }
  };

  // Auto-fetch suggestions when entering a new stage — but only after the
  // on-device model is loaded.
  useEffect(() => {
    if (!trip || !preferences) return;
    if (!localAgent.isReady) return;
    if (autoFetchedRef.current[stage]) return;
    if (optionsByStage[stage].length > 0) return;
    autoFetchedRef.current[stage] = true;
    void requestSuggestions({ text: "" }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, trip, preferences, localAgent.isReady]);

  const isAdded = (optId: string) =>
    items.some((i) => i.payload && (i.payload as Record<string, unknown>).option_id === optId);

  const toggleAdd = async (option: AiroOption) => {
    const existing = items.find(
      (i) => i.payload && (i.payload as Record<string, unknown>).option_id === option.id,
    );
    if (existing) {
      const { error } = await supabase.from("trip_items").delete().eq("id", existing.id);
      if (error) return toast.error(error.message);
      setItems((arr) => arr.filter((i) => i.id !== existing.id));
      return;
    }
    const { data, error } = await supabase
      .from("trip_items")
      .insert({
        trip_id: tripId,
        type: stageToType(stage),
        title: option.title,
        subtitle: option.subtitle ?? null,
        description: option.description ?? null,
        image_url: option.image_url ?? null,
        price: option.price,
        currency: option.currency ?? "USD",
        rating: option.rating ?? null,
        best_value: option.best_value ?? false,
        start_date: option.start_date ?? null,
        end_date: option.end_date ?? null,
        booking_url: option.booking_url ?? null,
        payload: {
          ...(option.payload ?? {}),
          option_id: option.id,
          price_per_person: option.price_per_person ?? null,
          group_size: option.group_size ?? null,
        } as Database["public"]["Tables"]["trip_items"]["Insert"]["payload"],
        sort_order: items.length,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setItems((arr) => [...arr, data as TripItem]);
    toast.success(`Added "${option.title}" to your itinerary`);
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("trip_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((arr) => arr.filter((i) => i.id !== id));
  };

  const refreshSuggestions = () => {
    autoFetchedRef.current[stage] = false;
    setOptionsByStage((prev) => ({ ...prev, [stage]: [] }));
    void requestSuggestions({ text: "" }, true);
  };

  const nextStage: Record<Stage, Stage | null> = {
    flights: "hotels",
    hotels: "attractions",
    attractions: null,
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl px-6 pt-8">
        {/* Cinematic stage hero (Apple full-bleed × Airbnb warmth) */}
        <div className="airo-cinema aspect-[16/6] w-full mb-8">
          <div
            className="airo-cinema-bg"
            style={{
              backgroundImage: `url(${stageHeroFor(stage, preferences?.destination)})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="airo-cinema-content absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 sm:p-8">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md ring-1 ring-white/25">
                <span className="h-1.5 w-1.5 rounded-full airo-rausch-bg" />
                {t(`stage.${stage}`)}
              </span>
              <h1 className="airo-prose-display mt-3 font-serif-display text-3xl font-semibold text-white sm:text-4xl">
                {trip?.title ?? "…"}
              </h1>
              <p className="mt-1.5 text-sm text-white/85">
                {preferences?.destination || trip?.origin}
                {trip?.start_date ? ` · ${new Date(trip.start_date).toLocaleDateString()}` : ""}
                {trip?.traveler_count
                  ? ` · ${trip.traveler_count} ${trip.traveler_count === 1 ? "traveler" : "travelers"}`
                  : ""}
              </p>
            </div>
            <Link
              to="/trip/$tripId/review"
              params={{ tripId }}
              className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-foreground shadow hover:bg-white"
            >
              {t("basket.review")} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-10 rounded-3xl border border-border/50 bg-card p-6 airo-soft">
          <StageProgress current={stage} onSelect={setStage} />
        </div>

        {/* In-browser curator — silent, no downloads */}
        {localAgent.isReady && (
          <div className="mb-8 grid gap-3 sm:grid-cols-[1fr_auto] airo-fade">

            <AiroDrawer
              stage={stage}
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              thinking={thinking}
              onSubmit={(input) => {
                void requestSuggestions(input);
              }}
              trigger={
                <button className="group flex w-full items-center justify-between rounded-3xl border border-dashed border-border bg-surface p-5 text-start transition-colors hover:border-primary/50">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full airo-gradient text-primary-foreground">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-sm font-semibold">{t("drawer.title")}</div>
                      <div className="text-xs text-muted-foreground">
                        {stage === "flights"
                          ? t("drawer.placeholder")
                          : stage === "hotels"
                            ? t("drawer.placeholder.hotel")
                            : t("drawer.placeholder.attraction")}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
              }
            />
            <Button
              variant="outline"
              onClick={refreshSuggestions}
              disabled={thinking}
              className="rounded-3xl h-auto px-5"
              title="Get new AI picks"
            >
              <Wand2 className="me-2 h-4 w-4" />
              New picks
            </Button>
          </div>
        )}

        {/* Thinking shimmer */}
        {thinking && options.length === 0 && (
          <section className="mb-12">
            <h2 className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              <span className="airo-shimmer-text">Airo is curating for you</span>
              <span className="airo-typing-dots inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-3xl border border-border/50 bg-card airo-soft"
                >
                  <div className="aspect-[4/3] airo-thinking" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 w-3/4 rounded-full bg-muted airo-thinking" />
                    <div className="h-3 w-1/2 rounded-full bg-muted airo-thinking" />
                    <div className="h-9 w-full rounded-full bg-muted airo-thinking" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Options */}
        {options.length > 0 && (
          <section className="mb-12 airo-fade">
            <h2 className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary airo-float" />
              Curated for you · {t(`stage.${stage}`)}
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {options.map((o, i) => (
                <div
                  key={o.id}
                  className="airo-rise"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <OptionCard
                    option={o}
                    added={isAdded(o.id)}
                    onToggle={() => void toggleAdd(o)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Already in basket for this stage */}
        {stageItems.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              In your itinerary · {t(`stage.${stage}`)}
            </h2>
            <div className="space-y-3">
              {stageItems.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center gap-4 rounded-3xl border border-border/50 bg-card p-3 airo-soft"
                >
                  <div
                    className="h-16 w-20 shrink-0 rounded-2xl bg-cover bg-center"
                    style={{
                      backgroundImage: it.image_url
                        ? `url(${it.image_url})`
                        : "linear-gradient(135deg, var(--color-primary), var(--color-primary-glow))",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{it.title}</div>
                    {it.subtitle && (
                      <div className="truncate text-xs text-muted-foreground">{it.subtitle}</div>
                    )}
                  </div>
                  <div className="text-sm font-semibold tabular-nums">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: it.currency,
                      maximumFractionDigits: 0,
                    }).format(Number(it.price))}
                  </div>
                  {it.booking_url && (
                    <a
                      href={it.booking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 hover:bg-surface hover:border-primary/40 transition"
                      aria-label="Open booking link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => void removeItem(it.id)}
                    className="rounded-full text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Continue */}
        {nextStage[stage] && (
          <div className="mt-8 flex justify-end airo-fade">
            <Button
              variant="premium"
              size="xl"
              onClick={() => setStage(nextStage[stage]!)}
              className="airo-magnet"
            >
              {t("basket.next")} <ArrowRight className="ms-2 h-4 w-4" />
            </Button>
          </div>
        )}
        {!nextStage[stage] && items.length > 0 && (
          <div className="mt-8 flex justify-end airo-fade">
            <Button asChild variant="premium" size="xl" className="airo-magnet">
              <Link to="/trip/$tripId/review" params={{ tripId }}>
                {t("basket.review")} <ArrowRight className="ms-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </main>

      <LiveTotal total={total} currency={currency} itemCount={items.length} />
    </div>
  );
}

function stageToType(s: Stage): "flight" | "hotel" | "attraction" {
  return s === "flights" ? "flight" : s === "hotels" ? "hotel" : "attraction";
}

