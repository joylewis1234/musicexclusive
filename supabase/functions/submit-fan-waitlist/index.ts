import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { first_name, email, favorite_genre, favorite_artist } = await req.json();

    // Validate required fields
    if (!first_name || typeof first_name !== "string" || first_name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "First name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmedName = first_name.trim().slice(0, 100);
    const trimmedEmail = email.trim().toLowerCase().slice(0, 255);
    const trimmedGenre = favorite_genre ? String(favorite_genre).trim().slice(0, 100) : null;
    const trimmedArtist = favorite_artist ? String(favorite_artist).trim().slice(0, 100) : null;

    // Rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitKey = `fan_waitlist:${trimmedEmail}:${ip}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: rateData } = await supabase
      .from("request_rate_limits")
      .select("count")
      .eq("key", rateLimitKey)
      .eq("endpoint", "submit-fan-waitlist")
      .gte("window_start", windowStart)
      .maybeSingle();

    if (rateData && rateData.count >= 3) {
      return new Response(JSON.stringify({ error: "Too many attempts. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert rate limit
    await supabase.from("request_rate_limits").upsert(
      {
        key: rateLimitKey,
        endpoint: "submit-fan-waitlist",
        window_start: new Date().toISOString(),
        count: (rateData?.count || 0) + 1,
      },
      { onConflict: "key,endpoint" }
    );

    // Insert into fan_waitlist
    const { error: insertError } = await supabase.from("fan_waitlist").insert({
      first_name: trimmedName,
      email: trimmedEmail,
      favorite_genre: trimmedGenre,
      favorite_artist: trimmedArtist,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return new Response(JSON.stringify({ error: "This email is already registered." }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to register. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send confirmation email to fan
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Music Exclusive <noreply@musicexclusive.co>",
            to: [trimmedEmail],
            subject: "You've Secured Lifetime Access to Music Exclusive",
            html: `
              <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #f5f5f5; padding: 40px 30px; border-radius: 12px;">
                <h1 style="font-size: 24px; color: #00d4aa; margin-bottom: 8px; letter-spacing: 2px;">Welcome, Founding Superfan.</h1>
                <p style="color: #aaa; font-size: 15px; line-height: 1.7; margin-bottom: 20px;">
                  You're officially on the Music Exclusive early access list.
                </p>
                <p style="color: #ccc; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
                  Music Exclusive launches in 2026 with a new kind of streaming experience — one built around exclusivity, direct artist support, and superfans.
                </p>
                <p style="color: #ccc; font-size: 14px; line-height: 1.7; margin-bottom: 6px;">Because you joined early, you'll receive:</p>
                <ul style="color: #ccc; font-size: 14px; line-height: 2; padding-left: 20px; margin-bottom: 20px;">
                  <li>Lifetime access to Music Exclusive</li>
                  <li>Permanent Vault Lottery bypass</li>
                  <li>Early entry at launch</li>
                  <li>Access to exclusive music releases</li>
                  <li>Founding Superfan recognition</li>
                </ul>
                <p style="color: #00d4aa; font-size: 15px; font-weight: 600; margin-bottom: 20px;">
                  When the Vault opens, you won't be competing for access.<br/>You'll already be inside.
                </p>
                <p style="color: #888; font-size: 13px; line-height: 1.6;">
                  We'll email you before launch with your activation details.
                </p>
                <p style="color: #555; font-size: 12px; margin-top: 30px; border-top: 1px solid #222; padding-top: 20px;">
                  Founding spots are limited.<br/><br/>— Music Exclusive
                </p>
              </div>
            `,
          }),
        });
      } catch (emailErr) {
        console.error("Confirmation email error:", emailErr);
      }

      // Send admin notification
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Music Exclusive <noreply@musicexclusive.co>",
            to: ["support@musicexclusive.co"],
            subject: "New Founding Superfan Signup",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px;">
                <h2 style="color: #333;">New Founding Superfan Signup</h2>
                <p>A new Founding Superfan has joined the waitlist.</p>
                <table style="border-collapse: collapse; width: 100%; margin-top: 12px;">
                  <tr><td style="padding: 6px 12px; font-weight: bold; color: #555;">Name</td><td style="padding: 6px 12px;">${trimmedName}</td></tr>
                  <tr><td style="padding: 6px 12px; font-weight: bold; color: #555;">Email</td><td style="padding: 6px 12px;">${trimmedEmail}</td></tr>
                  <tr><td style="padding: 6px 12px; font-weight: bold; color: #555;">Genre</td><td style="padding: 6px 12px;">${trimmedGenre || "—"}</td></tr>
                  <tr><td style="padding: 6px 12px; font-weight: bold; color: #555;">Artist</td><td style="padding: 6px 12px;">${trimmedArtist || "—"}</td></tr>
                  <tr><td style="padding: 6px 12px; font-weight: bold; color: #555;">Submitted</td><td style="padding: 6px 12px;">${new Date().toISOString()}</td></tr>
                </table>
              </div>
            `,
          }),
        });
      } catch (adminErr) {
        console.error("Admin notification error:", adminErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
