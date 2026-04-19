// Public read of a shared trip by share_token (no auth required)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { share_token } = await req.json();
    if (!share_token) throw new Error("share_token required");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: trip } = await admin
      .from("trips")
      .select("id, title, origin, start_date, end_date, cover_image_url")
      .eq("share_token", share_token)
      .maybeSingle();
    if (!trip) {
      return new Response(JSON.stringify({ trip: null, items: [] }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: items } = await admin
      .from("trip_items")
      .select("id, type, title, subtitle, image_url, price, currency, start_date, end_date")
      .eq("trip_id", trip.id)
      .order("start_date", { ascending: true, nullsFirst: false });

    return new Response(JSON.stringify({ trip, items: items ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("airo-shared error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
