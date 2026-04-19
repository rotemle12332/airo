// AI suggestions for Airo — text + optional image analysis using Lovable AI Gateway
// Returns 4-6 rich option objects (flights / hotels / attractions) via tool calling.
// Now leverages full user preferences (styles, vibe, companion, group size, budget, kids, notes).
// deno-lint-ignore-file no-explicit-any

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { stage, text, image_data_url, trip, preferences, auto } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prefs = preferences ?? {};
    const groupSize = Number(prefs.group_size ?? trip?.traveler_count ?? 1);
    const styles: string[] = Array.isArray(prefs.styles) ? prefs.styles : [];
    const vibe = prefs.vibe ?? "balanced";
    const companion = prefs.companion ?? "solo";
    const withKids = !!prefs.with_kids;
    const notes = prefs.notes ?? "";
    const destination = prefs.destination ?? trip?.destination ?? "";
    const budgetMin = Number(prefs.budget_min ?? 500);
    const budgetMax = Number(prefs.budget_max ?? 5000);

    const stageDescription =
      stage === "flights"
        ? `Suggest 5 REAL, currently-operating flight options from ${trip?.origin || "the user's origin city"} to ${destination || "the destination"}.
CRITICAL REALISM RULES:
- Use ONLY airlines that actually fly this route in 2024–2025. Examples by region:
  * From TLV (Tel Aviv): El Al (LY), Arkia (IZ), Israir (6H), Lufthansa (LH), Turkish (TK), Wizz (W6), Ryanair (FR), United (UA), Delta (DL), Air France (AF), KLM (KL), British Airways (BA), Aegean (A3), Pegasus (PC), ITA Airways (AZ), Iberia (IB), Swiss (LX), Austrian (OS).
  * Long-haul to Asia from Europe/TLV: typically connects via DXB (Emirates EK), DOH (Qatar QR), IST (Turkish TK), AUH (Etihad EY) — direct is rare except EL AL TLV→NRT, EK direct DXB→NRT, etc.
  * North America to Europe: Delta, United, American, JetBlue, Air France, BA, KLM, Lufthansa, Virgin Atlantic.
- Use REAL flight numbers (e.g. LY 081, EK 932, LH 686, TK 785) — these are actual scheduled flights when possible.
- Use REAL airport IATA codes (TLV, JFK, LHR, CDG, FCO, NRT, HND, DXB, etc.) and realistic departure/arrival times.
- Realistic durations: TLV→FCO ~3h45m, TLV→JFK ~12h, TLV→NRT direct ~12h30m (LY only), with 1 stop ~16-20h.
- Prices in 2024 USD market range: short-haul Europe $200-450, mid-haul $400-900, long-haul economy $800-1800, business 3-5x economy.

title: "<Airline name> <flight code>" e.g. "El Al LY 081" or "Lufthansa LH 687 + LH 716".
subtitle: "<ORIGIN> → <DEST> · <duration> · <Direct or N stop in HUB>" e.g. "TLV → NRT · 12h 30m · Direct".
description: 2-3 sentences: cabin, baggage allowance, aircraft type (Boeing 787, A350, 737-800), notable perks.
extras.airline (full name), extras.flight_number, extras.aircraft, extras.origin_iata, extras.dest_iata, extras.stops (0/1/2), extras.stop_iata (if any), extras.duration_minutes, extras.cabin ("Economy"/"Premium Economy"/"Business"), extras.depart_time ("20:30"), extras.arrive_time ("13:00 +1").
booking_url: use realistic search URL like "https://www.google.com/travel/flights?q=<origin>+to+<dest>+<airline>" or the airline's official site.
Set start_date/end_date as full ISO datetimes matching depart/arrive.
Price is PER PERSON in USD.`
        : stage === "hotels"
          ? `Suggest 5 plausible hotels in ${destination || "the destination"} matching styles: ${styles.join(", ") || "any"}.
title: hotel name. subtitle: neighborhood + star rating ("Shibuya · 5★").
description: vibe, key amenities, what makes it special.
extras.neighborhood, extras.amenities (array of 3-5 strings like "Spa","Pool","Free breakfast"), extras.stars (1-5), extras.address.
Set start_date/end_date for check-in/out.
Price is PER NIGHT in USD for the room (not per person).`
          : `Suggest 5 attractions, restaurants, or experiences in ${destination || "the destination"} matching vibes: ${styles.join(", ") || vibe}.
title: venue name. subtitle: neighborhood + category ("Asakusa · Temple" or "Ginza · Sushi $$$").
description: why it's special, what to expect.
extras.category ("Museum"/"Restaurant"/"Outdoor"/"Nightlife"/"Shopping"/"Tour"), extras.duration_hours, extras.address, extras.opening_hours, extras.tags (array).
Optional start_date for a recommended time slot.
Price is PER PERSON in USD (0 if free).`;

    const systemPrompt = `You are Airo, a world-class AI travel concierge. Generate authentic, realistic, premium travel options.
USER PROFILE:
- Destination: ${destination || "unspecified"}
- Dates: ${prefs.start_date ?? trip?.start_date ?? "?"} → ${prefs.end_date ?? trip?.end_date ?? "?"}
- Travel companion: ${companion} (${groupSize} ${groupSize === 1 ? "person" : "people"})${withKids ? " WITH KIDS — keep it family-friendly" : ""}
- Travel styles: ${styles.join(", ") || "open to anything"}
- Vibe: ${vibe}
- Budget per person: $${budgetMin}–$${budgetMax}
- Notes: ${notes || "none"}

RULES:
- Use real-sounding venue/airline names, plausible market prices, realistic ratings (3.8–4.9).
- Mark 1-2 best options as best_value:true.
- Always provide booking_url with a real-looking link (booking.com, agoda, expedia, viator, getyourguide, opentable, or the venue's official site pattern).
- Tailor STRONGLY to the user profile above.${auto ? " The user has not typed a query — proactively suggest the most relevant options based on their profile alone." : ""}
${stageDescription}`;

    const userContent: any[] = [
      {
        type: "text",
        text:
          text ||
          `Suggest the best ${stage} for this trip based on my profile. Pick proactively — I trust you.`,
      },
    ];
    if (image_data_url) {
      userContent.push({
        type: "image_url",
        image_url: { url: image_data_url },
      });
      userContent.push({
        type: "text",
        text: "Identify the location/style shown in this image and tailor your suggestions to it.",
      });
    }

    const tools = [
      {
        type: "function",
        function: {
          name: "return_options",
          description: "Return 4-6 curated travel options",
          parameters: {
            type: "object",
            properties: {
              options: {
                type: "array",
                minItems: 4,
                maxItems: 6,
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    subtitle: { type: "string" },
                    description: { type: "string" },
                    price: { type: "number" },
                    currency: { type: "string", enum: ["USD"] },
                    rating: { type: "number" },
                    best_value: { type: "boolean" },
                    start_date: { type: "string" },
                    end_date: { type: "string" },
                    booking_url: { type: "string" },
                    extras: {
                      type: "object",
                      additionalProperties: true,
                    },
                  },
                  required: ["title", "price", "subtitle", "description", "booking_url"],
                  additionalProperties: false,
                },
              },
            },
            required: ["options"],
            additionalProperties: false,
          },
        },
      },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: stage === "flights" ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "return_options" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call returned");
    const args = JSON.parse(toolCall.function.arguments);

    const options = (args.options ?? []).map((o: any, i: number) => {
      const perPerson = Number(o.price) || 0;
      // Hotels priced per night for the room — don't multiply by group size.
      const isHotel = stage === "hotels";
      const totalPrice = isHotel ? perPerson : perPerson * Math.max(1, groupSize);

      return {
        id: `${Date.now()}-${i}`,
        title: o.title,
        subtitle: o.subtitle ?? null,
        description: o.description ?? null,
        price: totalPrice,
        price_per_person: isHotel ? null : perPerson,
        group_size: groupSize,
        currency: o.currency ?? "USD",
        rating: typeof o.rating === "number" ? o.rating : null,
        best_value: !!o.best_value,
        start_date: o.start_date ?? null,
        end_date: o.end_date ?? null,
        booking_url: o.booking_url ?? null,
        image_url: null,
        payload: { extras: o.extras ?? {}, stage },
      };
    });

    return new Response(JSON.stringify({ options }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("airo-suggest error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
