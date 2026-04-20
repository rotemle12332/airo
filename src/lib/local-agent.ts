// Airo Local Agent — runs Llama 3.2 3B fully on-device via WebLLM (WebGPU).
// No network calls, no AI credits, full privacy.
//
// We use the engine's structured output (JSON mode) to coerce the model into
// returning a strict schema for travel options across stages.

import * as webllm from "@mlc-ai/web-llm";

export type LocalStage = "flights" | "hotels" | "attractions";

export type LocalAgentOption = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
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

export type LocalAgentTrip = {
  origin?: string | null;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  traveler_count?: number | null;
};

export type LocalAgentPreferences = {
  styles?: string[];
  vibe?: string;
  companion?: string;
  with_kids?: boolean;
  group_size?: number;
  notes?: string;
  budget_min?: number;
  budget_max?: number;
};

// Default model: ~2GB download, balanced quality/speed for travel suggestions.
// q4f16_1 = 4-bit quantization, fp16 activations — best WebGPU sweet spot.
export const DEFAULT_LOCAL_MODEL = "Llama-3.2-3B-Instruct-q4f16_1-MLC";

// Lighter fallback (~900MB) if the user prefers a smaller download.
export const SMALL_LOCAL_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

// Singleton engine — load once per page lifetime.
let enginePromise: Promise<webllm.MLCEngine> | null = null;
let currentModelId: string | null = null;

export type LoadProgress = {
  text: string;
  progress: number; // 0..1
};

export async function getLocalEngine(
  modelId: string = DEFAULT_LOCAL_MODEL,
  onProgress?: (p: LoadProgress) => void,
): Promise<webllm.MLCEngine> {
  // Reset if user switched models.
  if (currentModelId && currentModelId !== modelId) {
    enginePromise = null;
  }
  if (!enginePromise) {
    currentModelId = modelId;
    enginePromise = webllm.CreateMLCEngine(modelId, {
      initProgressCallback: (report) => {
        onProgress?.({
          text: report.text,
          progress: typeof report.progress === "number" ? report.progress : 0,
        });
      },
    });
  }
  return enginePromise;
}

export function isWebGPUAvailable(): boolean {
  if (typeof navigator === "undefined") return false;
  // Note: navigator.gpu is undefined on Safari < 18 and most mobile browsers.
  return typeof (navigator as { gpu?: unknown }).gpu !== "undefined";
}

// JSON schema returned to the model (used for engine.chat.completions response_format).
const optionsResponseSchema = {
  type: "object",
  properties: {
    options: {
      type: "array",
      minItems: 4,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          description: { type: "string" },
          price: { type: "number" },
          rating: { type: "number" },
          best_value: { type: "boolean" },
          booking_url: { type: "string" },
        },
        required: ["title", "subtitle", "description", "price"],
      },
    },
  },
  required: ["options"],
};

function systemPrompt(
  stage: LocalStage,
  trip: LocalAgentTrip,
  prefs: LocalAgentPreferences,
): string {
  const groupSize = prefs.group_size ?? trip.traveler_count ?? 1;
  const styles = (prefs.styles ?? []).join(", ") || "balanced";
  const dest = trip.destination ?? "the destination";
  const origin = trip.origin ?? "the origin city";

  const stageSpec =
    stage === "flights"
      ? `Suggest 4 plausible flight options from ${origin} to ${dest}.
- title: "<Airline> <flight code>" e.g. "Lufthansa LH 686".
- subtitle: "<ORIGIN_IATA> → <DEST_IATA> · <duration> · Direct or N stops"
- description: 1-2 sentences about cabin, baggage, plane type.
- price: PER PERSON in USD (round number)
- rating: 3.8-4.8
- booking_url: "https://www.google.com/travel/flights"`
      : stage === "hotels"
        ? `Suggest 4 plausible hotels in ${dest} matching style: ${styles}.
- title: hotel name
- subtitle: "<neighborhood> · <stars>★"
- description: 1-2 sentences about vibe and amenities.
- price: PER NIGHT in USD for the room (not per person)
- rating: 4.0-4.8
- booking_url: "https://www.booking.com"`
        : `Suggest 4 attractions, restaurants, or experiences in ${dest} matching: ${styles}.
- title: venue name
- subtitle: "<neighborhood> · <category>"
- description: 1-2 sentences why it's special.
- price: PER PERSON in USD (0 if free)
- rating: 4.0-4.9
- booking_url: "https://www.viator.com"`;

  return `You are Airo, a concise on-device travel agent. Return ONLY valid JSON matching the schema.
USER PROFILE:
- Group: ${groupSize} ${prefs.companion ?? "solo"}${prefs.with_kids ? " (with kids)" : ""}
- Style: ${styles} · Vibe: ${prefs.vibe ?? "balanced"}
- Budget per person: $${prefs.budget_min ?? 500}-$${prefs.budget_max ?? 5000}
- Notes: ${prefs.notes || "none"}

TASK: ${stageSpec}

RULES:
- Mark exactly 1 best_value:true.
- Use realistic-sounding names. Numbers should be plausible market prices.
- Output ONLY JSON, no markdown, no code fences, no commentary.`;
}

function userPrompt(stage: LocalStage, text: string): string {
  if (text.trim().length > 0) {
    return `${text.trim()}\n\nReturn 4 ${stage} options as JSON.`;
  }
  return `Suggest the best ${stage} for me based on my profile. Return 4 options as JSON.`;
}

export type GenerateInput = {
  stage: LocalStage;
  text: string;
  trip: LocalAgentTrip;
  preferences: LocalAgentPreferences;
};

export async function generateLocalSuggestions(
  engine: webllm.MLCEngine,
  input: GenerateInput,
): Promise<LocalAgentOption[]> {
  const { stage, text, trip, preferences } = input;
  const groupSize = preferences.group_size ?? trip.traveler_count ?? 1;

  const reply = await engine.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt(stage, trip, preferences) },
      { role: "user", content: userPrompt(stage, text) },
    ],
    // Structured output via grammar-constrained decoding (supported in WebLLM).
    response_format: {
      type: "json_object",
      schema: JSON.stringify(optionsResponseSchema),
    },
    max_tokens: 1500,
    temperature: 0.7,
  });

  const raw = reply.choices?.[0]?.message?.content ?? "{}";
  let parsed: { options?: Array<Record<string, unknown>> } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Llama 3.2 3B occasionally wraps JSON in markdown — strip and retry.
    const cleaned = raw
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { options: [] };
    }
  }

  const isHotel = stage === "hotels";
  const opts = (parsed.options ?? []).slice(0, 5).map((o, i) => {
    const perPerson = Number(o.price) || 0;
    const totalPrice = isHotel ? perPerson : perPerson * Math.max(1, groupSize);
    return {
      id: `local-${Date.now()}-${i}`,
      title: String(o.title ?? "Option"),
      subtitle: typeof o.subtitle === "string" ? o.subtitle : undefined,
      description: typeof o.description === "string" ? o.description : undefined,
      price: totalPrice,
      price_per_person: isHotel ? null : perPerson,
      group_size: groupSize,
      currency: "USD",
      rating: typeof o.rating === "number" ? o.rating : undefined,
      best_value: !!o.best_value,
      booking_url:
        typeof o.booking_url === "string" && o.booking_url.length > 0
          ? o.booking_url
          : null,
      payload: { extras: {}, stage, generated_locally: true },
    } satisfies LocalAgentOption;
  });

  // Make sure exactly one card is marked best_value (prevents the model from
  // forgetting or marking all of them).
  if (opts.length > 0 && !opts.some((o) => o.best_value)) {
    opts[0].best_value = true;
  }

  return opts;
}
