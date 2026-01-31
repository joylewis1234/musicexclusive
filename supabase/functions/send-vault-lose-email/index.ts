import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VaultLoseRequest {
  email: string;
  name: string;
  vaultCode: string;
  appUrl: string;
}

type ResendErrorPayload = {
  message?: string;
  error?: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const PRIMARY_FROM = "Music Exclusive <noreply@musicexclusive.co>";
const FALLBACK_FROM = "Music Exclusive <onboarding@resend.dev>";

async function sendResendEmail(args: {
  resendKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; status: number; message: string } > {
  const emailResponse = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: args.from,
      to: [args.to],
      subject: args.subject,
      html: args.html,
    }),
  });

  if (emailResponse.ok) return { ok: true };

  // Resend sometimes returns JSON, sometimes text. Try both.
  const contentType = emailResponse.headers.get("content-type") || "";
  let message = `Resend API error: ${emailResponse.status}`;
  try {
    if (contentType.includes("application/json")) {
      const data = (await emailResponse.json()) as ResendErrorPayload;
      message = data.message || data.error || message;
    } else {
      const text = await emailResponse.text();
      message = text || message;
    }
  } catch {
    // ignore parsing error
  }

  return { ok: false, status: emailResponse.status, message };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, vaultCode, appUrl }: VaultLoseRequest = await req.json();

    // Validate required fields
    if (!email || !name || !vaultCode) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, name, vaultCode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Build the return link with email and code pre-filled
    const returnLink = `${appUrl || 'https://id-preview--09644822-430a-4a4e-a068-bdf812a2aedf.lovable.app'}/vault/submit?email=${encodeURIComponent(email)}&code=${encodeURIComponent(vaultCode)}`;

    const subject = "Your Music Exclusive Vault Code 🔐";
    const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(128, 0, 255, 0.1)); border-radius: 16px; border: 1px solid rgba(139, 92, 246, 0.3); padding: 40px;">
                    <tr>
                      <td align="center" style="padding-bottom: 30px;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px;">🎶 Your Vault Entry is Confirmed</h1>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom: 20px;">
                        <p style="margin: 0; color: #a78bfa; font-size: 18px; letter-spacing: 1px;">Hey ${name}!</p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom: 30px;">
                        <p style="margin: 0; color: #a0a0a0; font-size: 16px; line-height: 1.6;">
                          You didn't unlock the Vault this time, but <strong style="color: #ffffff;">you're automatically entered into the next draw</strong>. Keep this code — you'll need it for your next Vault attempt.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom: 10px;">
                        <p style="margin: 0; color: #a0a0a0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Your Vault Code</p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom: 30px;">
                        <div style="background: rgba(139, 92, 246, 0.15); border: 2px solid rgba(139, 92, 246, 0.5); border-radius: 12px; padding: 20px 40px; display: inline-block;">
                          <span style="font-size: 36px; font-weight: bold; color: #a78bfa; letter-spacing: 12px; font-family: monospace;">${vaultCode}</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom: 30px;">
                        <a href="${returnLink}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #a855f7); color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 32px; border-radius: 8px; letter-spacing: 1px;">
                          RETURN TO VAULT
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom: 20px;">
                        <p style="margin: 0; color: #a0a0a0; font-size: 14px; line-height: 1.6;">
                          When you're ready, click the button above or use your code at:<br>
                          <a href="${returnLink}" style="color: #a78bfa; text-decoration: underline;">${appUrl || 'musicexclusive.app'}/vault/submit</a>
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center">
                        <p style="margin: 0; color: #606060; font-size: 12px;">
                          Want guaranteed access? <a href="${appUrl || 'https://id-preview--09644822-430a-4a4e-a068-bdf812a2aedf.lovable.app'}/subscribe" style="color: #a78bfa;">Become a Superfan →</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>

        `;

    // Try custom domain sender first; if the domain isn't verified, fall back to Resend test sender.
    const primaryAttempt = await sendResendEmail({
      resendKey,
      from: PRIMARY_FROM,
      to: email,
      subject,
      html,
    });

    if (!primaryAttempt.ok) {
      const msg = primaryAttempt.message.toLowerCase();
      const isDomainNotVerified = msg.includes("domain is not verified") || msg.includes("not verified");

      if (isDomainNotVerified) {
        console.warn(
          `Vault lose email: sender domain not verified; falling back to Resend test sender. Original error: ${primaryAttempt.message}`,
        );

        const fallbackAttempt = await sendResendEmail({
          resendKey,
          from: FALLBACK_FROM,
          to: email,
          subject,
          html,
        });

        if (!fallbackAttempt.ok) {
          console.error(`Vault lose email failed (fallback sender): ${fallbackAttempt.message}`);
          // Don't 500 the app for a non-critical email.
          return new Response(
            JSON.stringify({
              success: false,
              warning: "Email failed to send",
              error: fallbackAttempt.message,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      } else {
        console.error(`Vault lose email failed: ${primaryAttempt.message}`);
        // Don't 500 the app for a non-critical email.
        return new Response(
          JSON.stringify({
            success: false,
            warning: "Email failed to send",
            error: primaryAttempt.message,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    console.log(`Vault lose email sent to ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Vault lose email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Vault lose email error:", message);
    // Avoid blank-screening the app if email fails.
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
