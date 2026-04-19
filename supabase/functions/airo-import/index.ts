// Authenticated user imports a shared trip by share_token.
// Adds them as a collaborator on the original trip.
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
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authentication required");

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) throw new Error("Authentication failed");

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: trip } = await admin
      .from("trips")
      .select("id, owner_id")
      .eq("share_token", share_token)
      .maybeSingle();
    if (!trip) throw new Error("Trip not found");

    if (trip.owner_id === userData.user.id) {
      return new Response(JSON.stringify({ trip_id: trip.id, already_owner: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("trip_collaborators")
      .upsert(
        { trip_id: trip.id, user_id: userData.user.id, role: "viewer" },
        { onConflict: "trip_id,user_id" },
      );

    return new Response(JSON.stringify({ trip_id: trip.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("airo-import error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
