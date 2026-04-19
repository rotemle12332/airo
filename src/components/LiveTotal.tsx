import { Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function LiveTotal({
  total,
  currency = "USD",
  itemCount,
}: {
  total: number;
  currency?: string;
  itemCount: number;
}) {
  const { t, lang } = useI18n();
  const formatted = new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(total);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-6 airo-rise">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border/60 bg-card/90 px-5 py-3 airo-elevated backdrop-blur-xl airo-pulse-glow">
        <span className="flex h-8 w-8 items-center justify-center rounded-full airo-gradient">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </span>
        <div className="leading-tight">
          <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {t("basket.liveTotal")}
          </div>
          <div className="text-base font-semibold tabular-nums">{formatted}</div>
        </div>
        <span className="text-xs text-muted-foreground">· {itemCount}</span>
      </div>
    </div>
  );
}
