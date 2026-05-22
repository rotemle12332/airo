// Airo Local Agent — deterministic in-browser generator.
// Zero downloads, zero network, runs in microseconds.
// Returns 12 curated, plausible options per stage based on user preferences.

export type LocalStage = "flights" | "hotels" | "attractions";

export type LocalAgentOption = {
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

// Kept for backward compatibility with imports.
export const DEFAULT_LOCAL_MODEL = "airo-curator-v1";

export type LoadProgress = { text: string; progress: number };

export function isWebGPUAvailable(): boolean {
  return true; // deterministic engine has no requirements
}

// No-op engine for back-compat.
export async function getLocalEngine(): Promise<{ ready: true }> {
  return { ready: true };
}

export type GenerateInput = {
  stage: LocalStage;
  text: string;
  trip: LocalAgentTrip;
  preferences: LocalAgentPreferences;
};

// -------- deterministic seeded RNG --------
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickN<T>(arr: T[], n: number, rnd: () => number): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
function round(n: number, step = 5): number {
  return Math.round(n / step) * step;
}

// -------- data pools --------
const AIRLINES = [
  { name: "Lufthansa", code: "LH", country: "DE" },
  { name: "Air France", code: "AF", country: "FR" },
  { name: "British Airways", code: "BA", country: "GB" },
  { name: "KLM", code: "KL", country: "NL" },
  { name: "Emirates", code: "EK", country: "AE" },
  { name: "Turkish Airlines", code: "TK", country: "TR" },
  { name: "Delta", code: "DL", country: "US" },
  { name: "United", code: "UA", country: "US" },
  { name: "Iberia", code: "IB", country: "ES" },
  { name: "Swiss", code: "LX", country: "CH" },
  { name: "ITA Airways", code: "AZ", country: "IT" },
  { name: "Qatar Airways", code: "QR", country: "QA" },
];

const PLANES = ["A320neo", "A321", "B787-9", "A350-900", "B737 MAX 8", "A330-300"];

// Map a few popular destinations → IATA. Fallback derived from name.
const IATA: Record<string, string> = {
  Paris: "CDG",
  London: "LHR",
  "New York": "JFK",
  Tokyo: "NRT",
  Bali: "DPS",
  Santorini: "JTR",
  Dubai: "DXB",
  Rome: "FCO",
  Barcelona: "BCN",
  Amsterdam: "AMS",
  Bangkok: "BKK",
  Istanbul: "IST",
};
function iata(city?: string | null): string {
  if (!city) return "XXX";
  if (IATA[city]) return IATA[city];
  const letters = city.replace(/[^A-Za-z]/g, "").toUpperCase();
  return (letters.slice(0, 3) || "XXX").padEnd(3, "X");
}

const HOTEL_BRANDS = [
  "The", "Hotel", "Casa", "Villa", "Maison", "Palais", "Grand",
  "Boutique", "Riad", "Loft", "Suites", "House",
];
const HOTEL_NAMES = [
  "Aurelia", "Solène", "Marisol", "Belvedere", "Lumière", "Otto",
  "Castello", "Mirador", "Selene", "Atelier", "Saffron", "Calla",
  "Mosaic", "Cobalt", "Mistral", "Indigo", "Lazuli", "Verbena",
  "Olivar", "Cardinal", "Florin", "Aether", "Verona", "Iris",
];
const NEIGHBORHOODS = [
  "Old Town", "Marina", "Beachfront", "Downtown", "Riverside",
  "Historic Quarter", "Arts District", "Cliffside", "Old Port",
  "Cathedral Square", "Garden District", "Hilltop",
];
const HOTEL_AMENITIES = [
  "Rooftop pool", "Spa", "Sea view", "Breakfast included", "Free Wi-Fi",
  "Fitness center", "Concierge", "Bar & lounge", "Kid-friendly",
  "Pet-friendly", "Airport shuttle", "Garden",
];

const ATTRACTION_TEMPLATES: Record<
  string,
  { name: (city: string) => string; cat: string; tags: string[]; basePrice: number }[]
> = {
  culture: [
    { name: (c) => `${c} National Museum`, cat: "Museum", tags: ["Iconic", "Indoor", "Family-friendly"], basePrice: 22 },
    { name: (c) => `${c} Old Town Walking Tour`, cat: "Walking tour", tags: ["Guided", "2h", "Local guide"], basePrice: 28 },
    { name: (c) => `${c} Cathedral & Crypt`, cat: "Landmark", tags: ["Historic", "Architecture"], basePrice: 18 },
    { name: () => `Sunset at the Old Bridge`, cat: "Viewpoint", tags: ["Free", "Photo spot"], basePrice: 0 },
  ],
  beach: [
    { name: () => `Catamaran Sunset Cruise`, cat: "Cruise", tags: ["3h", "Drinks included"], basePrice: 75 },
    { name: () => `Snorkeling at Blue Lagoon`, cat: "Water", tags: ["Gear included", "Half-day"], basePrice: 55 },
    { name: () => `Private Beach Cabana`, cat: "Beach club", tags: ["Lounger", "Towels"], basePrice: 45 },
    { name: () => `Paddleboard Sunrise`, cat: "Water", tags: ["Beginner", "1.5h"], basePrice: 35 },
  ],
  foodie: [
    { name: (c) => `${c} Street Food Tour`, cat: "Food tour", tags: ["3h", "6 stops", "Small group"], basePrice: 65 },
    { name: () => `Hands-on Pasta Class`, cat: "Cooking", tags: ["Hands-on", "Wine pairing"], basePrice: 85 },
    { name: () => `Chef's Tasting Menu — Osteria Verde`, cat: "Restaurant", tags: ["Reservation", "Tasting"], basePrice: 95 },
    { name: () => `Local Market & Wine`, cat: "Market", tags: ["Morning", "Tastings"], basePrice: 40 },
  ],
  adventure: [
    { name: () => `Sunrise Volcano Hike`, cat: "Hike", tags: ["Strenuous", "5h"], basePrice: 60 },
    { name: () => `Canyon Zipline Park`, cat: "Adventure", tags: ["Adrenaline", "Half-day"], basePrice: 90 },
    { name: () => `E-Bike Coastal Loop`, cat: "Cycling", tags: ["Easy", "Self-guided"], basePrice: 45 },
    { name: () => `Cave Kayaking`, cat: "Water", tags: ["Guided", "Gear included"], basePrice: 70 },
  ],
  luxury: [
    { name: () => `Private Helicopter Tour`, cat: "VIP", tags: ["30 min", "Champagne"], basePrice: 280 },
    { name: () => `Couples Spa Ritual`, cat: "Spa", tags: ["90 min", "Two therapists"], basePrice: 220 },
    { name: () => `Private Yacht Charter`, cat: "VIP", tags: ["Half-day", "Crew"], basePrice: 450 },
    { name: () => `Michelin Tasting at La Source`, cat: "Restaurant", tags: ["2★", "Wine pairing"], basePrice: 195 },
  ],
  city: [
    { name: (c) => `${c} Skyline Observation Deck`, cat: "Viewpoint", tags: ["Iconic", "1h"], basePrice: 32 },
    { name: (c) => `Hop-on Hop-off ${c}`, cat: "Tour", tags: ["24h pass"], basePrice: 38 },
    { name: () => `Underground History Tour`, cat: "Tour", tags: ["Guided", "1.5h"], basePrice: 28 },
    { name: () => `Rooftop Cocktail at Atlas`, cat: "Nightlife", tags: ["Skyline view"], basePrice: 24 },
  ],
};

// -------- core generator --------
function makeSeed(input: GenerateInput): number {
  const key = [
    input.stage,
    input.trip.origin ?? "",
    input.trip.destination ?? "",
    (input.preferences.styles ?? []).join(","),
    input.preferences.vibe ?? "",
    input.preferences.companion ?? "",
    input.preferences.budget_min ?? "",
    input.preferences.budget_max ?? "",
    input.text || "",
  ].join("|");
  return hashStr(key);
}

function budgetTarget(stage: LocalStage, prefs: LocalAgentPreferences): number {
  const min = prefs.budget_min ?? 500;
  const max = prefs.budget_max ?? 2500;
  const mid = (min + max) / 2;
  // Heuristic split of total budget across stages, per person.
  if (stage === "flights") return Math.max(180, mid * 0.3);
  if (stage === "hotels") return Math.max(80, mid * 0.18); // per night
  return Math.max(20, mid * 0.04); // per attraction
}

function genFlights(input: GenerateInput, rnd: () => number): LocalAgentOption[] {
  const target = budgetTarget("flights", input.preferences);
  const groupSize = input.preferences.group_size ?? input.trip.traveler_count ?? 1;
  const origin = iata(input.trip.origin || "Home");
  const dest = iata(input.trip.destination || "Destination");
  const airlines = pickN(AIRLINES, 12, rnd);
  return airlines.map((a, i) => {
    const stops = rnd() < 0.55 ? 0 : rnd() < 0.8 ? 1 : 2;
    const durationMin = 90 + Math.floor(rnd() * 540) + stops * 90;
    const h = Math.floor(durationMin / 60);
    const m = durationMin % 60;
    const cabin = rnd() < 0.7 ? "Economy" : rnd() < 0.9 ? "Premium Economy" : "Business";
    const factor =
      (cabin === "Economy" ? 0.85 : cabin === "Premium Economy" ? 1.3 : 2.4) *
      (stops === 0 ? 1.15 : stops === 1 ? 0.95 : 0.8);
    const perPerson = round(target * factor * (0.85 + rnd() * 0.35), 5);
    const flightNum = 100 + Math.floor(rnd() * 899);
    const plane = PLANES[Math.floor(rnd() * PLANES.length)];
    return {
      id: `flight-${i}-${a.code}${flightNum}`,
      title: `${a.name} ${a.code} ${flightNum}`,
      subtitle: `${origin} → ${dest} · ${h}h ${m}m · ${stops === 0 ? "Direct" : `${stops} stop${stops > 1 ? "s" : ""}`}`,
      description: `${cabin} cabin on ${plane}. ${stops === 0 ? "Nonstop service" : `Connecting via hub`}. Checked bag and seat selection included.`,
      image_url: `https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=70&sig=${i}`,
      price: perPerson * Math.max(1, groupSize),
      price_per_person: perPerson,
      group_size: groupSize,
      currency: "USD",
      rating: Number((3.8 + rnd() * 1.0).toFixed(1)),
      best_value: false,
      booking_url: "https://www.google.com/travel/flights",
      payload: {
        stage: "flights",
        extras: { cabin, stops, duration_minutes: durationMin, airline: a.name, plane },
        generated_locally: true,
      },
    } satisfies LocalAgentOption;
  });
}

function genHotels(input: GenerateInput, rnd: () => number): LocalAgentOption[] {
  const target = budgetTarget("hotels", input.preferences);
  const dest = input.trip.destination || "the destination";
  const styles = input.preferences.styles ?? [];
  const isLuxury = styles.includes("luxury");
  const isBeach = styles.includes("beach");
  const result: LocalAgentOption[] = [];
  const seenNames = new Set<string>();
  for (let i = 0; i < 12; i++) {
    let name = "";
    let attempts = 0;
    do {
      const brand = HOTEL_BRANDS[Math.floor(rnd() * HOTEL_BRANDS.length)];
      const word = HOTEL_NAMES[Math.floor(rnd() * HOTEL_NAMES.length)];
      name = `${brand} ${word}`;
      attempts++;
    } while (seenNames.has(name) && attempts < 6);
    seenNames.add(name);
    const stars = isLuxury ? 4 + Math.floor(rnd() * 2) : 3 + Math.floor(rnd() * 3);
    const hood = isBeach
      ? ["Beachfront", "Marina", "Old Port", "Cliffside"][Math.floor(rnd() * 4)]
      : NEIGHBORHOODS[Math.floor(rnd() * NEIGHBORHOODS.length)];
    const amen = pickN(HOTEL_AMENITIES, 3 + Math.floor(rnd() * 2), rnd);
    const pricePerNight = round(
      target * (stars / 4) * (0.7 + rnd() * 0.7) * (isLuxury ? 1.6 : 1),
      5,
    );
    result.push({
      id: `hotel-${i}-${name.replace(/\s+/g, "-")}`,
      title: name,
      subtitle: `${hood}, ${dest} · ${stars}★`,
      description: `${stars}★ stay in ${hood}. Known for ${amen.slice(0, 2).join(" and ").toLowerCase()}.`,
      image_url: `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=70&sig=${i}`,
      price: pricePerNight,
      price_per_person: null,
      group_size: input.preferences.group_size ?? 1,
      currency: "USD",
      rating: Number((4 + rnd() * 0.9).toFixed(1)),
      best_value: false,
      booking_url: "https://www.booking.com",
      payload: {
        stage: "hotels",
        extras: { stars, amenities: amen, neighborhood: hood },
        generated_locally: true,
      },
    });
  }
  return result;
}

function genAttractions(input: GenerateInput, rnd: () => number): LocalAgentOption[] {
  const dest = input.trip.destination || "the city";
  const styles = input.preferences.styles ?? [];
  const groupSize = input.preferences.group_size ?? input.trip.traveler_count ?? 1;
  const pool: { name: string; cat: string; tags: string[]; basePrice: number }[] = [];
  const active = styles.length > 0 ? styles : ["culture", "city", "foodie"];
  for (const style of active) {
    const tmpl = ATTRACTION_TEMPLATES[style];
    if (tmpl) tmpl.forEach((t) => pool.push({ ...t, name: t.name(dest) }));
  }
  // Top up from culture/city if pool < 12.
  for (const style of ["culture", "city", "foodie", "adventure", "beach"]) {
    if (pool.length >= 12) break;
    const tmpl = ATTRACTION_TEMPLATES[style];
    if (!tmpl) continue;
    tmpl.forEach((t) => {
      if (pool.length < 12) pool.push({ ...t, name: t.name(dest) });
    });
  }
  const seen = new Set<string>();
  const shuffled = pickN(pool, pool.length, rnd).filter((p) => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
  return shuffled.slice(0, 12).map((p, i) => {
    const price = p.basePrice === 0 ? 0 : round(p.basePrice * (0.85 + rnd() * 0.4), 1);
    return {
      id: `attr-${i}-${p.name.replace(/\s+/g, "-")}`,
      title: p.name,
      subtitle: `${dest} · ${p.cat}`,
      description: `${p.cat} in ${dest}. ${p.tags.slice(0, 2).join(", ")}.`,
      image_url: `https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=70&sig=${i}`,
      price: price * Math.max(1, groupSize),
      price_per_person: price,
      group_size: groupSize,
      currency: "USD",
      rating: Number((4 + Math.random() * 0.9).toFixed(1)),
      best_value: false,
      booking_url: "https://www.viator.com",
      payload: {
        stage: "attractions",
        extras: { category: p.cat, tags: p.tags },
        generated_locally: true,
      },
    } satisfies LocalAgentOption;
  });
}

export async function generateLocalSuggestions(
  _engine: unknown,
  input: GenerateInput,
): Promise<LocalAgentOption[]> {
  // Simulate a tiny async tick so the UI shimmer is visible (~120ms).
  await new Promise((r) => setTimeout(r, 120));
  const rnd = mulberry32(makeSeed(input));
  let opts: LocalAgentOption[];
  if (input.stage === "flights") opts = genFlights(input, rnd);
  else if (input.stage === "hotels") opts = genHotels(input, rnd);
  else opts = genAttractions(input, rnd);

  // Sort by price ascending, mark cheapest reasonable as best_value.
  opts.sort((a, b) => a.price - b.price);
  if (opts.length >= 3) opts[Math.min(2, opts.length - 1)].best_value = true;
  else if (opts.length > 0) opts[0].best_value = true;
  return opts;
}
