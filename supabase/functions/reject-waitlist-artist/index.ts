import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { verifyAdmin } from "../_shared/verify-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { error: updateError } = await supabase
      .from("artist_waitlist")
      .update({ status: "rejected" })
      .eq("id", waitlistId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send rejection email
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
            subject: "Music Exclusive Artist Waitlist Update",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px 20px;">
                <h1 style="text-align: center; font-size: 24px; margin-bottom: 24px;">Thank you for applying, ${entry.artist_name}.</h1>
                <div style="background: #111; border: 1px solid #222; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                  <p style="color: #ccc; font-size: 14px; line-height: 1.6;">
                    After reviewing your application, we're unable to offer a Founding Artist spot at this time.
                  </p>
                  <p style="color: #ccc; font-size: 14px; line-height: 1.6;">
                    We encourage you to continue building your audience and consider reapplying in the future. We're always looking for passionate artists to join the platform.
                  </p>
                </div>
                <p style="text-align: center; color: #666; font-size: 12px;">© 2026 Music Exclusive. All rights reserved.</p>
              </div>
            `,
          }),
        });
      }
    } catch (e) {
      console.error("[reject-waitlist] Email failed:", e);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    console.error("[reject-waitlist] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
