import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Plane,
  Search,
  MapPin,
  Check,
  Heart,
  Plus,
  Users,
  Minus,
  Sparkles,
} from "lucide-react";
import { AiroLogo } from "@/components/AiroLogo";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

import flightImg from "@/assets/wizard-flight.jpg";
import destinationImg from "@/assets/wizard-destination.jpg";
import vibeImg from "@/assets/wizard-vibe.jpg";
import budgetImg from "@/assets/wizard-budget.jpg";

import luxuryImg from "@/assets/style-luxury.jpg";
import beachImg from "@/assets/style-beach.jpg";
import adventureImg from "@/assets/style-adventure.jpg";
import cultureImg from "@/assets/style-culture.jpg";
import foodieImg from "@/assets/style-foodie.jpg";
import cityImg from "@/assets/style-city.jpg";

import soloImg from "@/assets/companion-solo.jpg";
import coupleImg from "@/assets/companion-couple.jpg";
import familyImg from "@/assets/companion-family.jpg";
import friendsImg from "@/assets/companion-friends.jpg";

export const Route = createFileRoute("/trip/new")({
  component: NewTripWizard,
});

const TOTAL_STEPS = 6;

const POPULAR = [
  { name: "Santorini", country: "Greece", emoji: "🇬🇷" },
  { name: "Bali", country: "Indonesia", emoji: "🇮🇩" },
  { name: "Paris", country: "France", emoji: "🇫🇷" },
  { name: "Tokyo", country: "Japan", emoji: "🇯🇵" },
  { name: "Dubai", country: "UAE", emoji: "🇦🇪" },
];

const STYLES = [
  { id: "luxury", label: "Luxury", img: luxuryImg },
  { id: "beach", label: "Relax & Beach", img: beachImg },
  { id: "adventure", label: "Adventure", img: adventureImg },
  { id: "culture", label: "Culture & History", img: cultureImg },
  { id: "foodie", label: "Foodie", img: foodieImg },
  { id: "city", label: "City Escape", img: cityImg },
];

const COMPANIONS = [
  { id: "solo", label: "Just me", img: soloImg, people: 1 },
  { id: "couple", label: "Couple", img: coupleImg, people: 2 },
  { id: "family", label: "Family", img: familyImg, people: 4 },
  { id: "friends", label: "Friends", img: friendsImg, people: 3 },
];

const VIBES = [
  { id: "relaxed", label: "Relaxed", sub: "Take it slow", icon: "🌿" },
  { id: "balanced", label: "Balanced", sub: "Mix of both", icon: "⚖️" },
  { id: "active", label: "Action Packed", sub: "Go, go, go!", icon: "🏔️" },
  { id: "yolo", label: "YOLO", sub: "Once in a lifetime", icon: "✨" },
];

export type AiroPreferences = {
  destination: string;
  origin?: string;
  start_date: string;
  end_date: string;
  flexible: boolean;
  styles: string[];
  companion: string;
  group_size: number;
  with_kids: boolean;
  vibe: string;
  notes: string;
  budget_min: number;
  budget_max: number;
};

function NewTripWizard() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [departure, setDeparture] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [flexible, setFlexible] = useState(false);
  const [destination, setDestination] = useState("");
  const [styles, setStyles] = useState<string[]>([]);
  const [companion, setCompanion] = useState<string>("");
  const [groupSize, setGroupSize] = useState<number>(2);
  const [withKids, setWithKids] = useState(false);
  const [vibe, setVibe] = useState<string>("balanced");
  const [notes, setNotes] = useState("");
  const [budget, setBudget] = useState<[number, number]>([1500, 2500]);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && !user && typeof window !== "undefined") {
    navigate({ to: "/auth", search: { redirect: "/trip/new" } });
    return null;
  }

  const needsGroupSize = companion === "family" || companion === "friends";

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => (step === 1 ? navigate({ to: "/" }) : setStep((s) => s - 1));

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const travelerCount =
        companion === "solo" ? 1 : companion === "couple" ? 2 : groupSize;

      const { data, error } = await supabase
        .from("trips")
        .insert({
          owner_id: user.id,
          title: destination ? `${destination} Journey` : "Untitled Journey",
          origin: null,
          start_date: departure || null,
          end_date: returnDate || null,
          traveler_count: travelerCount,
        })
        .select()
        .single();
      if (error) throw error;

      // Persist preferences for the plan page (no schema migration needed)
      const prefs: AiroPreferences = {
        destination,
        start_date: departure,
        end_date: returnDate,
        flexible,
        styles,
        companion,
        group_size: travelerCount,
        with_kids: withKids,
        vibe,
        notes,
        budget_min: budget[0],
        budget_max: budget[1],
      };
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(`airo:prefs:${data.id}`, JSON.stringify(prefs));
      }

      toast.success("Airo is curating your journey…");
      navigate({ to: "/trip/$tripId/plan", params: { tripId: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create trip");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Cinematic background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 40% at 50% 0%, color-mix(in oklab, var(--color-primary) 22%, transparent) 0%, transparent 70%), radial-gradient(40% 30% at 90% 100%, color-mix(in oklab, var(--color-primary-glow) 18%, transparent) 0%, transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px]"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in oklab, var(--color-primary) 60%, transparent), transparent)",
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex h-16 w-full max-w-2xl items-center justify-between px-6">
        <button
          onClick={back}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/80 backdrop-blur-md hover:bg-surface transition"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <AiroLogo size={28} />
        <button
          onClick={() => navigate({ to: "/" })}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/80 backdrop-blur-md px-3 py-2 text-xs font-medium text-foreground/80 hover:bg-surface transition"
        >
          {t("wizard.skip")}
          <ArrowRight className="h-3 w-3" />
        </button>
      </header>

      {/* Progress */}
      <div className="relative z-10 mx-auto w-full max-w-2xl px-6 pt-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Step {step} <span className="text-foreground/60">of {TOTAL_STEPS}</span>
          </div>
          <div className="text-[10px] font-medium uppercase tracking-widest text-primary">
            <Sparkles className="inline h-3 w-3 me-1" /> Airo intelligence
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full airo-gradient transition-all duration-700"
            style={{
              width: `${(step / TOTAL_STEPS) * 100}%`,
              boxShadow: "0 0 20px var(--color-primary)",
            }}
          />
        </div>
      </div>

      <main className="relative z-10 mx-auto w-full max-w-2xl px-6 pb-32 pt-8">
        {step === 1 && (
          <Step
            title={t("wizard.step1.title")}
            subtitle={t("wizard.step1.subtitle")}
            heroImg={flightImg}
          >
            <div className="mt-6 grid grid-cols-2 gap-3">
              <DateCard
                icon={<Plane className="h-4 w-4" />}
                label={t("wizard.step1.departure")}
                value={departure}
                onChange={setDeparture}
              />
              <DateCard
                icon={<Plane className="h-4 w-4 rotate-180" />}
                label={t("wizard.step1.return")}
                value={returnDate}
                onChange={setReturnDate}
              />
            </div>
            <button
              type="button"
              onClick={() => setFlexible((v) => !v)}
              className={cn(
                "mt-3 flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-start transition",
                flexible
                  ? "border-primary/60 ring-2 ring-primary/20"
                  : "border-border/60 hover:bg-surface",
              )}
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                <CalendarDays className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">
                  {t("wizard.step1.flexible")}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t("wizard.step1.flexibleSub")}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </Step>
        )}

        {step === 2 && (
          <Step
            title={t("wizard.step2.title")}
            subtitle={t("wizard.step2.subtitle")}
            heroImg={destinationImg}
          >
            <div className="relative mt-6">
              <Search className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={t("wizard.step2.search")}
                className="h-14 w-full rounded-2xl border border-border/60 bg-card ps-11 pe-12 text-sm placeholder:text-muted-foreground/80 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <MapPin className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold">{t("wizard.step2.popular")}</div>
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {POPULAR.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setDestination(p.name)}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-2xl border text-start transition",
                      destination === p.name
                        ? "border-primary/70 ring-2 ring-primary/30 scale-[1.03]"
                        : "border-border/60 hover:scale-[1.02]",
                    )}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                      style={{
                        backgroundImage: `linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.75) 100%), url(${destinationImg})`,
                      }}
                    />
                    <div className="absolute inset-x-2 bottom-2 text-white">
                      <div className="text-xs font-semibold leading-tight">
                        {p.emoji} {p.name}
                      </div>
                      <div className="text-[10px] opacity-80">{p.country}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step
            title={t("wizard.step3.title")}
            subtitle={t("wizard.step3.subtitle")}
          >
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {STYLES.map((s) => {
                const active = styles.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      setStyles((arr) =>
                        active ? arr.filter((x) => x !== s.id) : [...arr, s.id],
                      )
                    }
                    className={cn(
                      "group relative aspect-[5/4] overflow-hidden rounded-2xl border text-start transition",
                      active
                        ? "border-primary/70 ring-2 ring-primary/30 scale-[1.02]"
                        : "border-border/60 hover:scale-[1.01]",
                    )}
                  >
                    <img
                      src={s.img}
                      alt={s.label}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    {active && (
                      <span className="absolute end-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <span className="absolute bottom-2 start-2 text-xs font-semibold text-white drop-shadow">
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setStyles(STYLES.map((s) => s.id))}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card p-3 text-sm text-foreground/80 hover:bg-surface transition"
            >
              <Heart className="h-4 w-4" />
              {t("wizard.step3.mix")}
            </button>
          </Step>
        )}

        {step === 4 && (
          <Step
            title={t("wizard.step4.title")}
            subtitle={t("wizard.step4.subtitle")}
          >
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {COMPANIONS.map((c) => {
                const active = companion === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCompanion(c.id);
                      if (c.id === "family" || c.id === "friends") {
                        setGroupSize((v) => (v < 3 ? c.people : v));
                      }
                    }}
                    className={cn(
                      "group relative aspect-[3/4] overflow-hidden rounded-2xl border text-start transition",
                      active
                        ? "border-primary/70 ring-2 ring-primary/30 scale-[1.02]"
                        : "border-border/60 hover:scale-[1.01]",
                    )}
                  >
                    <img
                      src={c.img}
                      alt={c.label}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    {active && (
                      <span className="absolute end-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <span className="absolute bottom-2 start-2 text-xs font-semibold text-white drop-shadow">
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Conditional group size stepper */}
            {needsGroupSize && (
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl airo-gradient text-primary-foreground">
                    <Users className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold">
                      {companion === "family" ? "How many in your family?" : "How many friends?"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      We'll multiply prices for the whole group
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGroupSize((v) => Math.max(2, v - 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card hover:bg-surface transition"
                    aria-label="Decrease"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <div className="min-w-[2.5rem] text-center text-2xl font-bold tabular-nums airo-gradient-text">
                    {groupSize}
                  </div>
                  <button
                    type="button"
                    onClick={() => setGroupSize((v) => Math.min(20, v + 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card hover:bg-surface transition"
                    aria-label="Increase"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm font-semibold">{t("wizard.step4.kids")}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("wizard.step4.kidsSub")}
                  </div>
                </div>
              </div>
              <Switch checked={withKids} onCheckedChange={setWithKids} />
            </div>
          </Step>
        )}

        {step === 5 && (
          <Step
            title={t("wizard.step5.title")}
            subtitle={t("wizard.step5.subtitle")}
            heroImg={vibeImg}
          >
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {VIBES.map((v) => {
                const active = vibe === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVibe(v.id)}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-4 text-center transition",
                      active
                        ? "border-primary/70 ring-2 ring-primary/30 scale-[1.02]"
                        : "border-border/60 hover:bg-surface",
                    )}
                  >
                    {active && (
                      <span className="absolute end-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <span className="text-2xl">{v.icon}</span>
                    <span className="text-sm font-semibold">{v.label}</span>
                    <span className="text-[11px] text-muted-foreground">{v.sub}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4">
              <Heart className="h-5 w-5 text-primary" />
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("wizard.step5.notes")}
                className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/80 focus:outline-none"
              />
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-foreground/80"
                aria-label="Add"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </Step>
        )}

        {step === 6 && (
          <Step
            title={t("wizard.step6.title")}
            subtitle={t("wizard.step6.subtitle")}
            heroImg={budgetImg}
          >
            <div className="mt-6 rounded-3xl border border-border/60 bg-card p-6">
              <div className="text-center text-xs font-medium text-muted-foreground">
                {t("wizard.step6.totalBudget")}
              </div>
              <div className="mt-2 text-center text-3xl font-bold airo-gradient-text">
                ${budget[0].toLocaleString()} – ${budget[1].toLocaleString()}
              </div>
              <div className="mt-6 px-2">
                <Slider
                  value={budget}
                  min={500}
                  max={5000}
                  step={100}
                  onValueChange={(v) => setBudget([v[0], v[1]] as [number, number])}
                />
              </div>
              <div className="mt-3 flex justify-between text-[10px] font-medium text-muted-foreground">
                <span>$500</span>
                <span>$1,000</span>
                <span>$1,500</span>
                <span>$2,500</span>
                <span>$5,000+</span>
              </div>
            </div>
          </Step>
        )}
      </main>

      {/* Footer CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/40 bg-background/85 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl">
          {step < TOTAL_STEPS ? (
            <Button
              onClick={next}
              className="h-14 w-full rounded-2xl airo-gradient text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-95 transition"
            >
              {t("wizard.next")}
              <ArrowRight className="ms-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={submitting}
              className="h-16 w-full flex-col rounded-2xl airo-gradient text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-95 transition"
            >
              <span>{submitting ? t("common.loading") + "…" : t("wizard.step6.cta") + " ✨"}</span>
              {!submitting && (
                <span className="text-[11px] font-normal opacity-90">
                  {t("wizard.step6.ctaSub")}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({
  title,
  subtitle,
  heroImg,
  children,
}: {
  title: string;
  subtitle: string;
  heroImg?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div
        className={cn(
          "flex items-start gap-6",
          heroImg ? "flex-col sm:flex-row sm:items-center" : "",
        )}
      >
        <div className="flex-1">
          <h1 className="font-serif-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {heroImg && (
          <img
            src={heroImg}
            alt=""
            loading="lazy"
            className="h-32 w-40 shrink-0 rounded-2xl object-cover sm:h-36 sm:w-44 airo-soft"
          />
        )}
      </div>
      {children}
    </div>
  );
}

function DateCard({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block cursor-pointer rounded-2xl border border-border/60 bg-card p-4 transition hover:bg-surface hover:border-primary/40">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-primary">
          {icon}
        </span>
        {label}
      </div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 w-full bg-transparent text-base font-semibold focus:outline-none"
      />
    </label>
  );
}
