import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Plane, Hotel, MapPin } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Trip = Database["public"]["Tables"]["trips"]["Row"];
type TripItem = Database["public"]["Tables"]["trip_items"]["Row"];

export const Route = createFileRoute("/trip/$tripId/review")({
  component: ReviewPage,
});

function ReviewPage() {
  const { tripId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [items, setItems] = useState<TripItem[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!loading && !user && typeof window !== "undefined") {
      navigate({ to: "/auth", search: { redirect: `/trip/${tripId}/review` } });
    }
  }, [loading, user, tripId, navigate]);

  useEffect(() => {
    if (!user) return;
    void Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).single(),
      supabase
        .from("trip_items")
        .select("*")
        .eq("trip_id", tripId)
        .order("start_date", { ascending: true, nullsFirst: false })
        .order("sort_order"),
    ]).then(([tRes, iRes]) => {
      if (tRes.data) setTrip(tRes.data as Trip);
      if (iRes.data) setItems(iRes.data as TripItem[]);
    });
  }, [user, tripId]);

  const total = items.reduce((s, i) => s + Number(i.price), 0);
  const currency = items[0]?.currency ?? "USD";

  const exportPdf = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("airo-pdf", {
        body: { trip_id: tripId },
      });
      if (error) throw error;
      if (data?.pdf_base64) {
        const blob = base64ToBlob(data.pdf_base64, "application/pdf");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${trip?.title ?? "airo"}-itinerary.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Itinerary ready");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto w-full max-w-3xl px-6 pt-8 pb-24">
        <Button asChild variant="ghost" size="sm" className="rounded-full">
          <Link to="/trip/$tripId/plan" params={{ tripId }}>
            <ArrowLeft className="me-1 h-4 w-4" /> {t("common.back")}
          </Link>
        </Button>

        {/* Cinematic itinerary hero (Apple × Airbnb) */}
        <div className="airo-cinema mt-6 aspect-[16/7] w-full">
          <div
            className="airo-cinema-bg"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="airo-cinema-content absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 sm:p-8">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md ring-1 ring-white/25">
                <span className="h-1.5 w-1.5 rounded-full airo-rausch-bg" />
                {t("review.title")}
              </span>
              <h1 className="airo-prose-display mt-3 font-serif-display text-3xl font-semibold text-white sm:text-4xl">
                {trip?.title ?? t("review.title")}
              </h1>
              <p className="mt-1.5 text-sm text-white/85">
                {trip?.origin}
                {trip?.start_date && ` · ${new Date(trip.start_date).toLocaleDateString()}`}
                {trip?.end_date && ` – ${new Date(trip.end_date).toLocaleDateString()}`}
              </p>
            </div>
            <div className="rounded-2xl bg-white/95 px-4 py-2 text-end shadow-lg">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("basket.liveTotal")}
              </div>
              <div className="text-xl font-semibold airo-rausch tabular-nums">
                {new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-US", {
                  style: "currency",
                  currency,
                  maximumFractionDigits: 0,
                }).format(total)}
              </div>
            </div>
          </div>
        </div>


        {items.length === 0 ? (
          <div className="mt-16 rounded-3xl border border-dashed border-border bg-surface p-12 text-center text-sm text-muted-foreground">
            {t("review.empty")}
          </div>
        ) : (
          <div className="relative mt-12 ps-8">
            <div className="absolute start-3 top-2 bottom-2 w-px bg-border" />
            <ol className="space-y-6">
              {items.map((it) => {
                const Icon =
                  it.type === "flight" ? Plane : it.type === "hotel" ? Hotel : MapPin;
                return (
                  <li key={it.id} className="relative">
                    <span className="absolute -start-8 top-3 flex h-6 w-6 items-center justify-center rounded-full airo-gradient text-primary-foreground">
                      <Icon className="h-3 w-3" />
                    </span>
                    <div className="overflow-hidden rounded-3xl border border-border/50 bg-card airo-soft">
                      <div className="flex flex-col sm:flex-row">
                        <div
                          className="h-32 w-full shrink-0 bg-cover bg-center sm:h-auto sm:w-40"
                          style={{
                            backgroundImage: it.image_url
                              ? `url(${it.image_url})`
                              : "linear-gradient(135deg, var(--color-primary), var(--color-primary-glow))",
                          }}
                        />
                        <div className="flex-1 p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t(`stage.${it.type}s`)}
                              </div>
                              <h3 className="mt-1 text-base font-semibold">{it.title}</h3>
                              {it.subtitle && (
                                <p className="text-xs text-muted-foreground">{it.subtitle}</p>
                              )}
                            </div>
                            <div className="text-end text-sm font-semibold tabular-nums airo-gradient-text">
                              {new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-US", {
                                style: "currency",
                                currency: it.currency,
                                maximumFractionDigits: 0,
                              }).format(Number(it.price))}
                            </div>
                          </div>
                          {(it.start_date || it.end_date) && (
                            <div className="mt-3 text-xs text-muted-foreground">
                              {it.start_date && new Date(it.start_date).toLocaleString()}
                              {it.end_date && ` – ${new Date(it.end_date).toLocaleString()}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={() => void exportPdf()}
              disabled={exporting}
              className="airo-pill h-14 px-8 text-base airo-button-shimmer airo-press-deep disabled:opacity-60"
            >
              <Download className="me-2 inline h-5 w-5" />
              {exporting ? t("review.exporting") + "…" : t("review.export")}
            </button>
          </div>
        )}

      </main>
    </div>
  );
}

function base64ToBlob(base64: string, type: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}
