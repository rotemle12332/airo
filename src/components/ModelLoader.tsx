// Beautiful UI for loading the on-device AI model.
// Shows progress bar, current download stage, and clear messaging about
// the one-time download (~2GB) and offline-after-load benefits.

import { Cpu, Download, ShieldCheck, WifiOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { LoadProgress } from "@/lib/local-agent";
import type { LocalAgentStatus } from "@/hooks/useLocalAgent";

export function ModelLoader({
  status,
  progress,
  error,
  onLoad,
  modelLabel,
}: {
  status: LocalAgentStatus;
  progress: LoadProgress;
  error: string | null;
  onLoad: () => void;
  modelLabel: string;
}) {
  if (status === "ready") return null;

  if (status === "unsupported") {
    return (
      <div className="rounded-3xl border border-destructive/30 bg-card p-8 airo-soft">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="space-y-2">
            <h3 className="font-serif-display text-xl font-semibold">
              On-device AI not supported
            </h3>
            <p className="text-sm text-muted-foreground">
              Your browser doesn't support WebGPU, which is required to run the
              AI model locally. Try Chrome 113+ or Edge on a desktop with a GPU.
            </p>
            <p className="text-xs text-muted-foreground/80">
              Tip: WebGPU works on most modern laptops and desktops, but is
              limited on iOS/Safari and older Android devices.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    const pct = Math.round((progress.progress || 0) * 100);
    return (
      <div className="rounded-3xl border border-border/50 bg-card p-8 airo-soft">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full airo-gradient text-primary-foreground airo-float">
            <Cpu className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <div className="font-semibold text-base">Preparing your private AI…</div>
            <div className="text-xs text-muted-foreground">
              {progress.text || "Initializing…"}
            </div>
          </div>
          <div className="text-2xl font-bold tabular-nums airo-gradient-text">
            {pct}%
          </div>
        </div>
        <Progress value={pct} className="mt-5 h-2" />
        <p className="mt-4 text-xs text-muted-foreground">
          This one-time download (~2 GB) is cached in your browser. Future trips
          load instantly and work offline.
        </p>
      </div>
    );
  }

  // idle or error → show CTA
  return (
    <div className="rounded-3xl border border-border/50 bg-card p-8 airo-soft">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full airo-gradient text-primary-foreground">
          <Cpu className="h-5 w-5" />
        </span>
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-serif-display text-xl font-semibold tracking-tight">
              Activate on-device AI
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Airo will run <span className="font-medium text-foreground">{modelLabel}</span>{" "}
              fully on your device — no servers, no API keys, no usage limits.
            </p>
          </div>

          <ul className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              100% private
            </li>
            <li className="flex items-center gap-2">
              <WifiOff className="h-3.5 w-3.5 text-success" />
              Works offline
            </li>
            <li className="flex items-center gap-2">
              <Download className="h-3.5 w-3.5 text-success" />
              One-time ~2 GB
            </li>
          </ul>

          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <Button onClick={onLoad} variant="premium" size="lg" className="rounded-full">
            <Download className="me-2 h-4 w-4" />
            {status === "error" ? "Retry download" : "Download & activate"}
          </Button>
        </div>
      </div>
    </div>
  );
}
