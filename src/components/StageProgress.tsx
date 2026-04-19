import { Plane, Hotel, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export type Stage = "flights" | "hotels" | "attractions";

const stages: { key: Stage; tKey: string; Icon: typeof Plane }[] = [
  { key: "flights", tKey: "stage.flights", Icon: Plane },
  { key: "hotels", tKey: "stage.hotels", Icon: Hotel },
  { key: "attractions", tKey: "stage.attractions", Icon: MapPin },
];

export function StageProgress({
  current,
  onSelect,
}: {
  current: Stage;
  onSelect: (s: Stage) => void;
}) {
  const { t } = useI18n();
  const currentIdx = stages.findIndex((s) => s.key === current);

  return (
    <div className="w-full">
      <div className="relative flex items-center justify-between gap-2">
        {/* Track */}
        <div className="absolute inset-x-4 top-5 h-0.5 bg-border" />
        <div
          className="absolute start-4 top-5 h-0.5 airo-gradient transition-all duration-500"
          style={{ width: `calc((100% - 2rem) * ${currentIdx / (stages.length - 1)})` }}
        />

        {stages.map((s, i) => {
          const reached = i <= currentIdx;
          const active = s.key === current;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onSelect(s.key)}
              className="relative z-10 flex flex-col items-center gap-2 group"
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border transition-all",
                  reached
                    ? "airo-gradient border-transparent text-primary-foreground"
                    : "border-border bg-surface text-muted-foreground",
                  active && "scale-110 airo-glow",
                )}
              >
                <s.Icon className="h-4 w-4" />
              </span>
              <span
                className={cn(
                  "text-xs font-medium",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {t(s.tKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
