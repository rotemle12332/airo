// Server-side PDF generation for Airo itinerary
// Premium magazine-style layout • pure JS • edge-compatible
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "https://esm.sh/pdf-lib@1.17.1";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// WinAnsi-safe sanitizer: replace common Unicode glyphs with ASCII equivalents.
// pdf-lib's standard fonts only support the WinAnsi codepage.
function safe(text: unknown): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/[\u2192\u2794\u27A1\u2B95]/g, "->")
    .replace(/[\u2190\u2B05]/g, "<-")
    .replace(/[\u2194\u21D4]/g, "<->")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "•".charCodeAt(0) <= 255 ? "•" : "*")
    .replace(/\u00A0/g, " ")
    .replace(/[\u2605\u2606]/g, "*")
    // strip everything still outside WinAnsi printable range
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");
}

type Ctx = {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  width: number;
  height: number;
  y: number;
};

const COLORS = {
  ink: rgb(0.09, 0.1, 0.16),
  muted: rgb(0.45, 0.47, 0.55),
  hairline: rgb(0.88, 0.89, 0.93),
  surface: rgb(0.98, 0.98, 0.99),
  airoBlue: rgb(0.32, 0.42, 0.92),
  airoBlueDeep: rgb(0.18, 0.24, 0.6),
  accent: rgb(0.95, 0.82, 0.36),
  white: rgb(1, 1, 1),
};

function newPage(ctx: Ctx) {
  ctx.page = ctx.pdf.addPage([595, 842]);
  ctx.width = 595;
  ctx.height = 842;
  ctx.y = ctx.height - 60;
  // page number / footer hairline
  ctx.page.drawLine({
    start: { x: 40, y: 50 },
    end: { x: ctx.width - 40, y: 50 },
    thickness: 0.5,
    color: COLORS.hairline,
  });
  ctx.page.drawText("AIRO  ·  Personal Itinerary", {
    x: 40,
    y: 36,
    size: 7.5,
    font: ctx.font,
    color: COLORS.muted,
  });
}

function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.y - needed < 70) {
    newPage(ctx);
  }
}

function drawText(
  ctx: Ctx,
  text: string,
  opts: { x: number; y: number; size: number; font?: PDFFont; color?: ReturnType<typeof rgb>; maxWidth?: number },
) {
  const t = safe(text);
  if (!t) return;
  ctx.page.drawText(t, {
    x: opts.x,
    y: opts.y,
    size: opts.size,
    font: opts.font ?? ctx.font,
    color: opts.color ?? COLORS.ink,
    maxWidth: opts.maxWidth,
  });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = safe(text).split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return safe(iso);
  }
}

function dayKey(iso: string | null | undefined): string {
  if (!iso) return "Unscheduled";
  try {
    const d = new Date(iso);
    return d.toISOString().slice(0, 10);
  } catch {
    return "Unscheduled";
  }
}

const TYPE_META: Record<string, { label: string; emoji: string; color: ReturnType<typeof rgb> }> = {
  flight: { label: "FLIGHT", emoji: "Air", color: rgb(0.32, 0.42, 0.92) },
  flights: { label: "FLIGHT", emoji: "Air", color: rgb(0.32, 0.42, 0.92) },
  hotel: { label: "STAY", emoji: "Stay", color: rgb(0.86, 0.4, 0.42) },
  hotels: { label: "STAY", emoji: "Stay", color: rgb(0.86, 0.4, 0.42) },
  attraction: { label: "EXPERIENCE", emoji: "Exp", color: rgb(0.36, 0.66, 0.46) },
  attractions: { label: "EXPERIENCE", emoji: "Exp", color: rgb(0.36, 0.66, 0.46) },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { trip_id } = await req.json();
    if (!trip_id) throw new Error("trip_id required");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authentication required");
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) throw new Error("Authentication failed");

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: trip } = await admin.from("trips").select("*").eq("id", trip_id).single();
    if (!trip) throw new Error("Trip not found");
    if (trip.owner_id !== userData.user.id) throw new Error("Not authorized");

    const { data: items } = await admin
      .from("trip_items")
      .select("*")
      .eq("trip_id", trip_id)
      .order("start_date", { ascending: true, nullsFirst: false });

    const origin = req.headers.get("origin") || req.headers.get("referer") || "https://airo.app";
    const finalShareUrl = `${origin.replace(/\/$/, "")}/shared/${trip.share_token}`;

    // ── Build PDF ────────────────────────────────────────────────────────────
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

    const ctx: Ctx = {
      pdf,
      page: pdf.addPage([595, 842]),
      font,
      bold,
      italic,
      width: 595,
      height: 842,
      y: 842,
    };

    // ── COVER PAGE ───────────────────────────────────────────────────────────
    // Diagonal twin-tone gradient (more dramatic than uniform)
    const layers = 80;
    for (let i = 0; i < layers; i++) {
      const t = i / layers;
      // S-curve for richer transition
      const e = t * t * (3 - 2 * t);
      const r = 0.10 + (0.36 - 0.10) * e;
      const g = 0.16 + (0.46 - 0.16) * e;
      const b = 0.45 + (0.95 - 0.45) * e;
      ctx.page.drawRectangle({
        x: 0,
        y: ctx.height - ((i + 1) * ctx.height) / layers,
        width: ctx.width,
        height: ctx.height / layers + 1,
        color: rgb(r, g, b),
      });
    }
    // Layered glow circles for depth
    ctx.page.drawCircle({ x: ctx.width - 60, y: ctx.height - 90, size: 220, color: rgb(1, 1, 1), opacity: 0.07 });
    ctx.page.drawCircle({ x: ctx.width - 60, y: ctx.height - 90, size: 130, color: rgb(1, 1, 1), opacity: 0.05 });
    ctx.page.drawCircle({ x: 40, y: 240, size: 280, color: rgb(1, 1, 1), opacity: 0.04 });
    ctx.page.drawCircle({ x: ctx.width / 2, y: 460, size: 60, color: COLORS.accent, opacity: 0.18 });

    // Diagonal accent ribbon
    ctx.page.drawRectangle({
      x: -20, y: ctx.height - 130, width: ctx.width + 40, height: 2,
      color: COLORS.accent, opacity: 0.45,
    });

    // Brand mark
    drawText(ctx, "AIRO", { x: 50, y: ctx.height - 70, size: 26, font: bold, color: COLORS.white });
    drawText(ctx, "EFFORTLESS  ·  AI  ·  TRAVEL", {
      x: 50, y: ctx.height - 92, size: 8, font: bold, color: rgb(1, 1, 1),
    });
    ctx.page.drawLine({
      start: { x: 50, y: ctx.height - 100 },
      end: { x: 150, y: ctx.height - 100 },
      thickness: 1.2, color: COLORS.accent,
    });

    // Big title (centered visual weight, generous leading)
    const titleLines = wrapText(trip.title ?? "Untitled Journey", bold, 44, ctx.width - 100);
    let titleY = ctx.height - 220;
    for (const line of titleLines) {
      drawText(ctx, line, { x: 50, y: titleY, size: 44, font: bold, color: COLORS.white });
      titleY -= 50;
    }
    // Italic flourish under title
    drawText(ctx, "An Airo-curated journey", {
      x: 50, y: titleY - 6, size: 12, font: italic, color: rgb(1, 1, 1),
    });

    // Subline: dates + travelers
    const dateLine = [
      trip.origin ? `From ${trip.origin}` : "",
      trip.start_date ? formatDate(trip.start_date) : "",
      trip.end_date ? `- ${formatDate(trip.end_date)}` : "",
    ].filter(Boolean).join("  ·  ");
    if (dateLine) {
      drawText(ctx, dateLine, { x: 50, y: titleY - 28, size: 11, font: bold, color: rgb(1, 1, 1) });
    }
    drawText(ctx, `${trip.traveler_count ?? 1} traveler(s)`, {
      x: 50, y: titleY - 44, size: 10, color: rgb(1, 1, 1),
    });

    // Stat bar (taller, with accent top border)
    const total = (items ?? []).reduce((s, i) => s + Number(i.price), 0);
    const currency = items?.[0]?.currency ?? "USD";
    const flightCount = (items ?? []).filter((i) => i.type?.startsWith("flight")).length;
    const hotelCount = (items ?? []).filter((i) => i.type?.startsWith("hotel")).length;
    const expCount = (items ?? []).filter((i) => i.type?.startsWith("attraction")).length;

    const barY = 140;
    const barH = 100;
    // Shadow plate
    ctx.page.drawRectangle({
      x: 36, y: barY - 4, width: ctx.width - 72, height: barH,
      color: rgb(0, 0, 0), opacity: 0.18,
    });
    ctx.page.drawRectangle({
      x: 40, y: barY, width: ctx.width - 80, height: barH,
      color: rgb(1, 1, 1), opacity: 0.98,
    });
    // Accent top border
    ctx.page.drawRectangle({
      x: 40, y: barY + barH - 3, width: ctx.width - 80, height: 3,
      color: COLORS.accent,
    });

    const stats = [
      { label: "TOTAL", value: `${currency} ${total.toFixed(0)}` },
      { label: "FLIGHTS", value: String(flightCount) },
      { label: "STAYS", value: String(hotelCount) },
      { label: "EXPERIENCES", value: String(expCount) },
    ];
    const cellW = (ctx.width - 80) / stats.length;
    stats.forEach((s, i) => {
      const cx = 40 + i * cellW + 18;
      drawText(ctx, s.label, { x: cx, y: barY + 70, size: 7.5, font: bold, color: COLORS.muted });
      drawText(ctx, s.value, { x: cx, y: barY + 32, size: 20, font: bold, color: COLORS.airoBlueDeep });
      if (i < stats.length - 1) {
        ctx.page.drawLine({
          start: { x: 40 + (i + 1) * cellW, y: barY + 22 },
          end: { x: 40 + (i + 1) * cellW, y: barY + 80 },
          thickness: 0.5, color: COLORS.hairline,
        });
      }
    });

    // Footer tagline on cover
    drawText(ctx, "Curated by Airo  ·  Your silent travel concierge", {
      x: 40, y: 70, size: 8.5, color: rgb(1, 1, 1),
    });

    // QR on cover bottom-right with refined frame
    try {
      const qrDataUrl = await QRCode.toDataURL(finalShareUrl, {
        margin: 1, width: 240,
        color: { dark: "#1a1f4d", light: "#ffffff" },
      });
      const qrPng = await pdf.embedPng(qrDataUrl);
      const qrSize = 70;
      // Shadow
      ctx.page.drawRectangle({
        x: ctx.width - qrSize - 48, y: 46,
        width: qrSize + 24, height: qrSize + 32,
        color: rgb(0, 0, 0), opacity: 0.2,
      });
      ctx.page.drawRectangle({
        x: ctx.width - qrSize - 50, y: 50,
        width: qrSize + 24, height: qrSize + 32,
        color: rgb(1, 1, 1),
      });
      ctx.page.drawImage(qrPng, {
        x: ctx.width - qrSize - 38, y: 62, width: qrSize, height: qrSize,
      });
      drawText(ctx, "SCAN TO IMPORT", {
        x: ctx.width - qrSize - 36, y: 54, size: 6.5, font: bold, color: COLORS.airoBlueDeep,
      });
    } catch (e) {
      console.error("QR generation failed:", e);
    }

    // ── ITINERARY PAGES ──────────────────────────────────────────────────────
    newPage(ctx);

    // Section header
    drawText(ctx, "YOUR JOURNEY", { x: 40, y: ctx.y, size: 8, font: bold, color: COLORS.airoBlue });
    ctx.y -= 16;
    drawText(ctx, "Day by day", { x: 40, y: ctx.y, size: 26, font: bold, color: COLORS.ink });
    ctx.y -= 14;
    ctx.page.drawLine({
      start: { x: 40, y: ctx.y },
      end: { x: 90, y: ctx.y },
      thickness: 2,
      color: COLORS.accent,
    });
    ctx.y -= 24;

    // Group items by day
    const grouped = new Map<string, typeof items>();
    for (const it of items ?? []) {
      const k = dayKey(it.start_date);
      if (!grouped.has(k)) grouped.set(k, [] as typeof items);
      grouped.get(k)!.push(it);
    }

    if (!items || items.length === 0) {
      drawText(ctx, "No items added yet. Visit your trip in the Airo app to plan.", {
        x: 40,
        y: ctx.y,
        size: 11,
        color: COLORS.muted,
      });
    }

    for (const [day, dayItems] of grouped) {
      ensureSpace(ctx, 60);
      // Day header
      const dayLabel = day === "Unscheduled" ? "Unscheduled" : formatDate(day);
      ctx.page.drawRectangle({
        x: 40,
        y: ctx.y - 4,
        width: 4,
        height: 22,
        color: COLORS.airoBlue,
      });
      drawText(ctx, dayLabel.toUpperCase(), {
        x: 54,
        y: ctx.y + 4,
        size: 11,
        font: bold,
        color: COLORS.ink,
      });
      drawText(ctx, `${dayItems!.length} item${dayItems!.length !== 1 ? "s" : ""}`, {
        x: ctx.width - 100,
        y: ctx.y + 4,
        size: 9,
        color: COLORS.muted,
      });
      ctx.y -= 22;

      for (const item of dayItems!) {
        const meta = TYPE_META[item.type] ?? {
          label: safe(item.type).toUpperCase(),
          emoji: "—",
          color: COLORS.airoBlue,
        };

        const titleLines = wrapText(item.title ?? "", bold, 13, ctx.width - 200);
        const subtitleLines = item.subtitle ? wrapText(item.subtitle, font, 9.5, ctx.width - 200) : [];
        const descLines = item.description
          ? wrapText(item.description, font, 9, ctx.width - 200).slice(0, 2)
          : [];
        const payload = (item.payload ?? {}) as Record<string, unknown>;
        const pricePerPerson = payload.price_per_person as number | null | undefined;
        const groupSize = payload.group_size as number | null | undefined;
        const showPp = !!(pricePerPerson && groupSize && groupSize > 1);

        const cardH =
          26 + // pill + spacing
          titleLines.length * 16 +
          subtitleLines.length * 12 +
          (descLines.length ? 8 + descLines.length * 12 : 0) +
          (showPp ? 14 : 0) +
          22;

        ensureSpace(ctx, cardH + 12);

        const cardTop = ctx.y;
        const cardBottom = ctx.y - cardH;

        // Soft drop shadow
        ctx.page.drawRectangle({
          x: 42, y: cardBottom - 2,
          width: ctx.width - 80, height: cardH,
          color: rgb(0, 0, 0), opacity: 0.04,
        });
        // Card background
        ctx.page.drawRectangle({
          x: 40, y: cardBottom,
          width: ctx.width - 80, height: cardH,
          color: COLORS.surface,
        });
        // Hairline border
        ctx.page.drawRectangle({
          x: 40, y: cardBottom + cardH - 0.5,
          width: ctx.width - 80, height: 0.5,
          color: COLORS.hairline,
        });
        ctx.page.drawRectangle({
          x: 40, y: cardBottom,
          width: ctx.width - 80, height: 0.5,
          color: COLORS.hairline,
        });
        // Left accent stripe in type color
        ctx.page.drawRectangle({
          x: 40, y: cardBottom, width: 4, height: cardH, color: meta.color,
        });

        let innerY = cardTop - 18;

        // Type pill
        const pillW = bold.widthOfTextAtSize(meta.label, 7.5) + 14;
        ctx.page.drawRectangle({
          x: 56,
          y: innerY - 4,
          width: pillW,
          height: 14,
          color: meta.color,
          opacity: 0.12,
        });
        drawText(ctx, meta.label, {
          x: 63,
          y: innerY,
          size: 7.5,
          font: bold,
          color: meta.color,
        });

        // Rating + best-value badges (right side, top)
        let badgeX = ctx.width - 56;
        if (item.best_value) {
          const txt = "BEST VALUE";
          const tw = bold.widthOfTextAtSize(txt, 7) + 14;
          badgeX -= tw;
          ctx.page.drawRectangle({
            x: badgeX,
            y: innerY - 4,
            width: tw,
            height: 14,
            color: COLORS.accent,
            opacity: 0.25,
          });
          drawText(ctx, txt, {
            x: badgeX + 7,
            y: innerY,
            size: 7,
            font: bold,
            color: rgb(0.55, 0.42, 0.05),
          });
          badgeX -= 6;
        }
        if (item.rating) {
          const rt = `* ${Number(item.rating).toFixed(1)}`;
          const rw = bold.widthOfTextAtSize(rt, 8) + 10;
          badgeX -= rw;
          drawText(ctx, rt, {
            x: badgeX + 5,
            y: innerY,
            size: 8,
            font: bold,
            color: COLORS.muted,
          });
        }

        innerY -= 22;

        // Title
        for (const line of titleLines) {
          drawText(ctx, line, { x: 56, y: innerY, size: 13, font: bold, color: COLORS.ink });
          innerY -= 16;
        }

        // Subtitle
        for (const line of subtitleLines) {
          drawText(ctx, line, { x: 56, y: innerY, size: 9.5, color: COLORS.muted });
          innerY -= 12;
        }

        // Description
        if (descLines.length) {
          innerY -= 4;
          for (const line of descLines) {
            drawText(ctx, line, { x: 56, y: innerY, size: 9, color: COLORS.ink });
            innerY -= 12;
          }
        }

        // Per-person breakdown
        if (showPp) {
          innerY -= 2;
          drawText(ctx, `${item.currency ?? "USD"} ${Number(pricePerPerson).toFixed(0)} pp  ·  ${groupSize} travelers`, {
            x: 56, y: innerY, size: 8.5, font: italic, color: COLORS.muted,
          });
        }

        // "TOTAL" label + price (right column)
        const priceText = `${item.currency ?? "USD"} ${Number(item.price).toFixed(0)}`;
        const pw = bold.widthOfTextAtSize(priceText, 16);
        drawText(ctx, "TOTAL", {
          x: ctx.width - 56 - bold.widthOfTextAtSize("TOTAL", 7),
          y: cardTop - cardH / 2 + 22,
          size: 7, font: bold, color: COLORS.muted,
        });
        drawText(ctx, priceText, {
          x: ctx.width - 56 - pw,
          y: cardTop - cardH / 2 + 4,
          size: 16, font: bold, color: COLORS.airoBlueDeep,
        });

        ctx.y = cardBottom - 10;
      }
      ctx.y -= 6;
    }

    // ── CLOSING PAGE ─────────────────────────────────────────────────────────
    ensureSpace(ctx, 200);
    if (ctx.y > 350) ctx.y -= 20;

    ctx.page.drawLine({
      start: { x: 40, y: ctx.y },
      end: { x: ctx.width - 40, y: ctx.y },
      thickness: 0.5,
      color: COLORS.hairline,
    });
    ctx.y -= 30;
    drawText(ctx, "Bon voyage.", { x: 40, y: ctx.y, size: 28, font: bold, color: COLORS.ink });
    ctx.y -= 22;
    drawText(ctx, "Crafted for you by Airo  ·  airo.app", {
      x: 40,
      y: ctx.y,
      size: 10,
      color: COLORS.muted,
    });

    const bytes = await pdf.save();
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const b64 = btoa(binary);

    return new Response(JSON.stringify({ pdf_base64: b64, share_url: finalShareUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("airo-pdf error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
