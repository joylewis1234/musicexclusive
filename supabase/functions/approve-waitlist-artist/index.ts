import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { verifyAdmin } from "../_shared/verify-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ARTIST_APPLY_URL = "https://www.musicexclusive.co/artist/apply";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin
    const { user, error: authError } = await verifyAdmin(req.headers.get("Authorization"));
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: authError || "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { waitlistId } = await req.json();
    if (!waitlistId) {
      return new Response(
        JSON.stringify({ error: "waitlistId required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get waitlist entry
    const { data: entry, error: fetchError } = await supabase
      .from("artist_waitlist")
      .select("*")
      .eq("id", waitlistId)
      .single();

    if (fetchError || !entry) {
      return new Response(
        JSON.stringify({ error: "Waitlist entry not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (entry.status === "approved") {
      return new Response(
        JSON.stringify({ error: "Already approved" }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update status to approved
    const { error: updateError } = await supabase
      .from("artist_waitlist")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq("id", waitlistId);

    if (updateError) {
      console.error("[approve-waitlist] Update error:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send approval email
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Music Exclusive <support@musicexclusive.co>",
            reply_to: "support@musicexclusive.co",
            to: [entry.email],
            subject: "You've Been Approved — Complete Your Artist Application",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px 20px;">
                <h1 style="text-align: center; font-size: 28px; margin-bottom: 8px;">Congratulations, ${entry.artist_name}!</h1>
                <p style="text-align: center; color: #22c55e; font-size: 16px; margin-bottom: 32px;">You've been selected as a Founding Artist.</p>

                <div style="background: #111; border: 1px solid #222; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                  <p style="color: #ccc; font-size: 14px; line-height: 1.6;">
                    We reviewed your application and we'd love to have you on Music Exclusive.
                  </p>
                  <p style="color: #ccc; font-size: 14px; line-height: 1.6;">
                    You are now invited to complete your <strong>Founding Artist onboarding</strong>.
                  </p>
                </div>

                <div style="text-align: center; margin: 32px 0;">
                  <a href="${ARTIST_APPLY_URL}" style="display: inline-block; background: #22c55e; color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                    Complete Your Application
                  </a>
                </div>

                <p style="text-align: center; color: #666; font-size: 12px; margin-top: 32px;">
                  © 2026 Music Exclusive. All rights reserved.
                </p>
              </div>
            `,
          }),
        });
      }
    } catch (e) {
      console.error("[approve-waitlist] Email failed:", e);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    console.error("[approve-waitlist] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
