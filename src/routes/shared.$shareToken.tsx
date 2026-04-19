import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plane, Hotel, MapPin, Plus } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

type SharedTrip = {
  id: string;
  title: string;
  origin: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
};

type SharedItem = {
  id: string;
  type: "flight" | "hotel" | "attraction";
  title: string;
  subtitle: string | null;
  image_url: string | null;
  price: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
};

export const Route = createFileRoute("/shared/$shareToken")({
  component: SharedPage,
});

function SharedPage() {
  const { shareToken } = Route.useParams();
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<SharedTrip | null>(null);
  const [items, setItems] = useState<SharedItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void supabase.functions
      .invoke("airo-shared", { body: { share_token: shareToken } })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else {
          setTrip(data?.trip ?? null);
          setItems(data?.items ?? []);
        }
        setLoading(false);
      });
  }, [shareToken]);

  const importTrip = async () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/shared/${shareToken}` } });
      return;
    }
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("airo-import", {
        body: { share_token: shareToken },
      });
      if (error) throw error;
      toast.success(t("shared.imported"));
      if (data?.trip_id) {
        navigate({ to: "/trip/$tripId/plan", params: { tripId: data.trip_id } });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const total = items.reduce((s, i) => s + Number(i.price), 0);
  const currency = items[0]?.currency ?? "USD";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-6 pt-8 pb-24">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {t("common.loading")}…
          </div>
        ) : !trip ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {t("common.error")}
          </div>
        ) : (
          <>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              {t("shared.title")}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{trip.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {trip.origin}
              {trip.start_date && ` · ${new Date(trip.start_date).toLocaleDateString()}`}
            </p>

            <div className="mt-8 flex items-center justify-between rounded-3xl border border-border/50 bg-card p-5 airo-soft">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("basket.liveTotal")}
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums airo-gradient-text">
                  {new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-US", {
                    style: "currency",
                    currency,
                    maximumFractionDigits: 0,
                  }).format(total)}
                </div>
              </div>
              <Button
                onClick={() => void importTrip()}
                disabled={importing}
                className="rounded-full airo-gradient h-11 px-5 text-primary-foreground hover:opacity-95"
              >
                <Plus className="me-1 h-4 w-4" />
                {importing ? t("common.loading") + "…" : t("shared.import")}
              </Button>
            </div>

            <div className="relative mt-10 ps-8">
              <div className="absolute start-3 top-2 bottom-2 w-px bg-border" />
              <ol className="space-y-5">
                {items.map((it) => {
                  const Icon =
                    it.type === "flight" ? Plane : it.type === "hotel" ? Hotel : MapPin;
                  return (
                    <li key={it.id} className="relative">
                      <span className="absolute -start-8 top-3 flex h-6 w-6 items-center justify-center rounded-full airo-gradient text-primary-foreground">
                        <Icon className="h-3 w-3" />
                      </span>
                      <div className="overflow-hidden rounded-3xl border border-border/50 bg-card airo-soft">
                        <div className="flex">
                          <div
                            className="h-24 w-32 shrink-0 bg-cover bg-center"
                            style={{
                              backgroundImage: it.image_url
                                ? `url(${it.image_url})`
                                : "linear-gradient(135deg, var(--color-primary), var(--color-primary-glow))",
                            }}
                          />
                          <div className="flex-1 p-4">
                            <h3 className="text-sm font-semibold">{it.title}</h3>
                            {it.subtitle && (
                              <p className="text-xs text-muted-foreground">{it.subtitle}</p>
                            )}
                            <div className="mt-2 text-sm font-semibold tabular-nums">
                              {new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-US", {
                                style: "currency",
                                currency: it.currency,
                                maximumFractionDigits: 0,
                              }).format(Number(it.price))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="mt-10 text-center">
              <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
                Airo
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
