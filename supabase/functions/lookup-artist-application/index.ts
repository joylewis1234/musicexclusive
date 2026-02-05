import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LookupRequest {
  email: string;
}

type ApplicationStatus =
  | "pending"
  | "approved"
  | "approved_pending_setup"
  | "active"
  | "rejected"
  | "not_approved"
  | string;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: LookupRequest = await req.json();
    const rawEmail = String(body?.email ?? "");
    const email = normalizeEmail(rawEmail);

    // Basic validation (kept minimal to avoid edge-case blocking)
    if (!email || !email.includes("@") || email.length > 255) {
      return new Response(
        JSON.stringify({
          success: false,
          found: false,
          message: "Please provide a valid email address.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role to bypass RLS (artist_applications is not readable to anon/authenticated by design)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabaseAdmin
      .from("artist_applications")
      .select("status, contact_email")
      .eq("contact_email", email)
      .maybeSingle();

    if (error) {
      console.error("[lookup-artist-application] query error:", error);
      return new Response(
        JSON.stringify({ success: false, found: false, message: "Lookup failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data) {
      // Important: keep copy generic to reduce email enumeration value.
      return new Response(
        JSON.stringify({
          success: true,
          found: false,
          message: "No approved application found for that email.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const status = String(data.status) as ApplicationStatus;

    return new Response(
      JSON.stringify({
        success: true,
        found: true,
        email: data.contact_email,
        status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[lookup-artist-application] unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, found: false, message: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});