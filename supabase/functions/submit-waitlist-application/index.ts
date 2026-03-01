import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MIN = 10;

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    // Validate required fields
    if (!body.email || !body.artist_name || !body.location || !body.music_link) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const email = String(body.email).toLowerCase().trim();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const endpoint = "artist_waitlist";
    const rateKey = `${email}|${ip}`;

    // Rate limit check
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("request_rate_limits")
      .select("id, count, window_start")
      .eq("key", rateKey)
      .eq("endpoint", endpoint)
      .gte("window_start", windowStart)
      .order("window_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && existing.count >= RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({ error: "Too many submissions. Please wait and try again." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Upsert rate limit counter
    if (existing) {
      await supabase
        .from("request_rate_limits")
        .update({ count: existing.count + 1, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("request_rate_limits").insert({
        key: rateKey,
        endpoint,
        window_start: new Date().toISOString(),
        count: 1,
      });
    }

    // Insert waitlist entry
    const { error: insertError } = await supabase
      .from("artist_waitlist")
      .insert({
        artist_name: body.artist_name,
        email,
        instagram: body.instagram || null,
        other_social: body.other_social || null,
        genre: body.genre || null,
        monthly_listeners: body.monthly_listeners || null,
        location: body.location,
        music_link: body.music_link,
        status: "pending",
      });

    if (insertError) {
      console.error("[submit-waitlist] Insert error:", insertError);
      if (insertError.message?.includes("unique") || insertError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "This email is already on the waitlist." }),
          { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send admin notification email (fire-and-forget)
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
            from: "Music Exclusive <noreply@musicexclusive.co>",
            to: ["support@musicexclusive.co"],
            subject: "New Artist Waitlist Application",
            html: `
              <h2>New Artist Waitlist Application</h2>
              <p><strong>Artist Name:</strong> ${body.artist_name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Instagram:</strong> ${body.instagram || "N/A"}</p>
              <p><strong>Other Social:</strong> ${body.other_social || "N/A"}</p>
              <p><strong>Genre:</strong> ${body.genre || "N/A"}</p>
              <p><strong>Monthly Listeners:</strong> ${body.monthly_listeners || "N/A"}</p>
              <p><strong>Location:</strong> ${body.location}</p>
              <p><strong>Music Link:</strong> ${body.music_link}</p>
              <p><strong>Date:</strong> ${new Date().toISOString()}</p>
            `,
          }),
        });
      }
    } catch (e) {
      console.error("[submit-waitlist] Admin email failed:", e);
    }

    // Send artist confirmation email (fire-and-forget)
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
            from: "Music Exclusive <noreply@musicexclusive.co>",
            to: [email],
            subject: "You're on the Music Exclusive Artist Waitlist",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px 20px;">
                <h1 style="text-align: center; font-size: 28px; margin-bottom: 8px;">Welcome, Founding Artist.</h1>
                <p style="text-align: center; color: #a0a0a0; font-size: 14px; margin-bottom: 32px;">You're on the Music Exclusive waitlist.</p>

                <div style="background: #111; border: 1px solid #222; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                  <h3 style="color: #22c55e; margin-top: 0;">Your Earning Potential</h3>
                  <p style="color: #ccc; font-size: 14px; line-height: 1.6;">
                    <strong>Scenario 1:</strong> 100 fans × 10 streams/week = 1,000 streams<br/>
                    1,000 × $0.10 = <strong style="color: #22c55e;">$100/week = $400/month</strong>
                  </p>
                  <p style="color: #ccc; font-size: 14px; line-height: 1.6;">
                    <strong>Scenario 2:</strong> 600 fans × 10 streams/week = 6,000 streams<br/>
                    6,000 × $0.10 = <strong style="color: #22c55e;">$600/week = $2,400/month</strong>
                  </p>
                </div>

                <div style="background: #111; border: 1px solid #222; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                  <h3 style="margin-top: 0;">What Happens Next</h3>
                  <ul style="color: #ccc; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                    <li>We review applications in waves</li>
                    <li>Founding spots are limited</li>
                    <li>Launching in 2026</li>
                    <li>You'll receive an email when approved</li>
                  </ul>
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
      console.error("[submit-waitlist] Artist confirmation email failed:", e);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    console.error("[submit-waitlist] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
