import { Star, Plus, Check, ExternalLink, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export type AiroOption = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image_url?: string;
  price: number;
  price_per_person?: number | null;
  group_size?: number;
  currency?: string;
  rating?: number;
  best_value?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  booking_url?: string | null;
  payload?: Record<string, unknown>;
};

export function OptionCard({
  option,
  added,
  onToggle,
}: {
  option: AiroOption;
  added: boolean;
  onToggle: () => void;
}) {
  const { t, lang } = useI18n();
  const fmt = (n: number) =>
    new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-US", {
      style: "currency",
      currency: option.currency || "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const totalPrice = fmt(option.price);
  const perPerson =
    option.price_per_person && option.group_size && option.group_size > 1
      ? fmt(option.price_per_person)
      : null;

  const extras = (option.payload?.extras as Record<string, unknown>) || {};
  const tags: string[] = [];
  if (typeof extras.cabin === "string") tags.push(extras.cabin);
  if (typeof extras.stops === "number")
    tags.push(extras.stops === 0 ? "Direct" : `${extras.stops} stop${extras.stops > 1 ? "s" : ""}`);
  if (typeof extras.duration_minutes === "number") {
    const h = Math.floor(extras.duration_minutes / 60);
    const m = extras.duration_minutes % 60;
    tags.push(`${h}h ${m}m`);
  }
  if (typeof extras.stars === "number") tags.push(`${extras.stars}★`);
  if (Array.isArray(extras.amenities))
    (extras.amenities as string[]).slice(0, 3).forEach((a) => tags.push(a));
  if (typeof extras.category === "string") tags.push(extras.category);
  if (typeof extras.duration_hours === "number") tags.push(`${extras.duration_hours}h`);
  if (Array.isArray(extras.tags))
    (extras.tags as string[]).slice(0, 3).forEach((tg) => tags.push(tg));

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border/50 bg-card airo-soft transition-all hover:airo-elevated hover:-translate-y-0.5">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {option.image_url ? (
          <img
            src={option.image_url}
            alt={option.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="airo-gradient h-full w-full animate-pulse" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {option.best_value && (
          <span className="absolute start-3 top-3 rounded-full bg-success px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-success-foreground shadow-lg">
            ★ {t("basket.bestValue")}
          </span>
        )}
        {option.rating ? (
          <span className="absolute end-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
            <Star className="h-3 w-3 fill-current" />
            {option.rating.toFixed(1)}
          </span>
        ) : null}

        {/* Floating price chip */}
        <div className="absolute bottom-3 end-3 rounded-2xl bg-card/95 px-3 py-1.5 backdrop-blur-md airo-soft">
          <div className="text-base font-bold tabular-nums airo-gradient-text leading-none">
            {totalPrice}
          </div>
          {perPerson && (
            <div className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              {perPerson} × {option.group_size}
            </div>
          )}
        </div>
      </div>

      <div className="p-5">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{option.title}</h3>
          {option.subtitle ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {option.subtitle}
            </p>
          ) : null}
        </div>

        {option.description ? (
          <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
            {option.description}
          </p>
        ) : null}

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.slice(0, 4).map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full border border-border/60 bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-foreground/70"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {perPerson && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>
              Total for {option.group_size} travelers · {perPerson} pp
            </span>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "airo-press inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-all",
              added
                ? "bg-success/10 text-success border border-success/20"
                : "airo-gradient text-primary-foreground hover:opacity-95 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30",
            )}
            aria-pressed={added}
            aria-label={added ? t("basket.added") : t("basket.add")}
          >
            {added ? (
              <>
                <Check className="h-4 w-4 airo-pop" /> {t("basket.added")}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> {t("basket.add")}
              </>
            )}
          </button>
          {option.booking_url && (
            <a
              href={option.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="airo-press inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card hover:bg-surface hover:border-primary/40 hover:scale-105 transition"
              aria-label={`Open booking link for ${option.title}`}
              title="View details"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
