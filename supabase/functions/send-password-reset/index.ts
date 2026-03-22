import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
    const { email, userType } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-password-reset] Requested for: ${email} (${userType})`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Derive redirect URL from request headers (supports production + preview)
    const referer = req.headers.get("referer") || req.headers.get("origin") || "";
    let siteOrigin = "";
    try {
      const url = new URL(referer);
      siteOrigin = url.origin;
    } catch {
      // Fallback chain: env var → production domain
      siteOrigin = Deno.env.get("SITE_URL") || "https://musicexclusive.co";
    }
    const redirectTo = `${siteOrigin}/reset-password`;
    console.log(`[send-password-reset] Redirect URL: ${redirectTo}`);

    // Generate password reset link directly (no need to list users)
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: email.trim().toLowerCase(),
      options: { redirectTo },
    });

    if (resetError) {
      console.warn(`[send-password-reset] generateLink error: ${resetError.message}`);
      // Security best practice: don't reveal if user exists or not
      // Return success either way
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists, a reset email will be sent." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const actionLink = resetData?.properties?.action_link;
    if (!actionLink) {
      console.error("[send-password-reset] No action_link generated");
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists, a reset email will be sent." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("[send-password-reset] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userTypeLabel = userType === "artist" ? "Artist" : "Fan";

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Music Exclusive <noreply@musicexclusive.co>",
        reply_to: "support@musicexclusive.co",
        to: [email.trim()],
        subject: "Reset Your Music Exclusive Password",
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; border: 1px solid rgba(139, 92, 246, 0.3);">
                  <tr>
                    <td style="padding: 40px;">
                      <h1 style="margin: 0 0 20px 0; color: #ffffff; font-size: 28px; text-align: center;">
                        🎵 Music Exclusive
                      </h1>
                      <p style="color: #a78bfa; font-size: 14px; text-align: center; margin: 0 0 30px 0;">
                        ${userTypeLabel} Password Reset
                      </p>
                      <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Hey there,
                      </p>
                      <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        We received a request to reset your password. Click the button below to create a new password:
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${actionLink}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600;">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                        This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.
                      </p>
                      <hr style="border: none; border-top: 1px solid rgba(139, 92, 246, 0.2); margin: 30px 0;">
                      <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
                        © Music Exclusive. Exclusive music, direct support.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json().catch(() => ({}));
      console.error("[send-password-reset] Resend API error:", JSON.stringify(errorData));
      return new Response(
        JSON.stringify({ error: "Failed to send reset email. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-password-reset] Email sent to ${email} (${userType}) via ${siteOrigin}`);

    return new Response(
      JSON.stringify({ success: true, message: "Password reset email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-password-reset] Unexpected error:", message);
    return new Response(
      JSON.stringify({ error: `Reset failed: ${message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
