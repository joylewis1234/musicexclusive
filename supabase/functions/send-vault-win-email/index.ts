import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ResendErrorPayload = {
  message?: string;
  error?: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const PRIMARY_FROM = "Music Exclusive <noreply@themusicisexclusive.com>";
const REPLY_TO = "support@musicexclusive.co";

async function sendResendEmail(args: {
  resendKey: string;
  from: string;
  replyTo: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: true; data?: unknown } | { ok: false; status: number; message: string }> {
  const emailResponse = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: args.from,
      reply_to: args.replyTo,
      to: [args.to],
      subject: args.subject,
      html: args.html,
    }),
  });

  if (emailResponse.ok) {
    try {
      const data = await emailResponse.json();
      return { ok: true, data };
    } catch {
      return { ok: true };
    }
  }

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

interface VaultWinRequest {
  email: string;
  name: string;
  vaultCode: string;
  appUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, vaultCode, appUrl }: VaultWinRequest = await req.json();

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

    const baseUrl = appUrl || 'https://id-preview--09644822-430a-4a4e-a068-bdf812a2aedf.lovable.app';
    const loginLink = `${baseUrl}/vault/congrats?email=${encodeURIComponent(email)}&code=${encodeURIComponent(vaultCode)}`;
    const resetPasswordLink = `${baseUrl}/forgot-password?email=${encodeURIComponent(email)}`;

    const subject = "🎉 You're In! Welcome to the Music Exclusive Vault";
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #050508; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #050508; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: linear-gradient(145deg, rgba(0, 212, 255, 0.08), rgba(139, 92, 246, 0.08), rgba(236, 72, 153, 0.05)); border-radius: 20px; border: 1px solid rgba(0, 212, 255, 0.25); padding: 48px 40px;">
          
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <img src="https://www.themusicisexclusive.com/favicon.png" alt="Music Exclusive" width="56" height="56" style="display: block; margin: 0 auto 16px auto; border-radius: 12px;" />
              <p style="margin: 0 0 8px 0; font-size: 14px; letter-spacing: 3px; color: #00d4ff; text-transform: uppercase;">You've Been Selected</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 1px;">🎉 Congratulations!</h1>
              <p style="margin: 12px 0 0 0; color: #00d4ff; font-size: 18px; font-weight: 500;">You officially have Vault Access</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="margin: 0; color: #ffffff; font-size: 18px;">Hi ${name},</p>
            </td>
          </tr>

          <!-- Body Copy -->
          <tr>
            <td style="padding-bottom: 28px;">
              <p style="margin: 0 0 16px 0; color: #b8b8c0; font-size: 16px; line-height: 1.7;">
                You're now getting <strong style="color: #ffffff;">early access to exclusive music</strong> that the rest of the world isn't hearing yet.
              </p>
              <p style="margin: 0; color: #b8b8c0; font-size: 16px; line-height: 1.7;">
                This is where artists drop music <strong style="color: #00d4ff;">FIRST</strong> — and you're one of the few who gets to experience it before it hits Spotify, Apple Music, and everywhere else.
              </p>
            </td>
          </tr>

          <!-- Vault Login Details -->
          <tr>
            <td style="padding-bottom: 32px;">
              <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(0, 212, 255, 0.2); border-radius: 16px; padding: 24px;">
                <p style="margin: 0 0 16px 0; color: #00d4ff; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">🔐 Your Vault Login Details</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #888; font-size: 14px;">Email:</span>
                      <span style="color: #ffffff; font-size: 14px; margin-left: 8px;">${email}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #888; font-size: 14px;">Vault Code:</span>
                      <span style="color: #00d4ff; font-size: 20px; font-weight: 700; letter-spacing: 6px; margin-left: 8px; font-family: monospace;">${vaultCode}</span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Next Step -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">✅ Next Step: Enter the Vault</p>
              <a href="${loginLink}" style="display: inline-block; background: linear-gradient(135deg, #00d4ff 0%, #8b5cf6 50%, #ec4899 100%); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 18px 48px; border-radius: 12px; letter-spacing: 1px; text-transform: uppercase;">
                ENTER MUSIC EXCLUSIVE
              </a>
            </td>
          </tr>

          <!-- Reset Password Section -->
          <tr>
            <td style="padding-bottom: 32px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px;">
              <p style="margin: 0 0 12px 0; color: #888; font-size: 14px;">🔁 Want to create a new password?</p>
              <p style="margin: 0 0 16px 0; color: #666; font-size: 13px;">If you'd like, you can set a new password after logging in for the first time.</p>
              <a href="${resetPasswordLink}" style="color: #8b5cf6; font-size: 14px; text-decoration: underline;">Create / Reset Password →</a>
            </td>
          </tr>

          <!-- Closing -->
          <tr>
            <td style="padding-top: 16px; border-top: 1px solid rgba(0, 212, 255, 0.15);">
              <p style="margin: 0 0 8px 0; color: #b8b8c0; font-size: 15px; line-height: 1.7;">
                Thank you for being part of something special.<br>
                You're early… and you're exactly who this Vault was built for 💎🎶
              </p>
              <p style="margin: 24px 0 4px 0; color: #888; font-size: 14px;">With love,</p>
              <p style="margin: 0 0 4px 0; color: #ffffff; font-size: 15px; font-weight: 600;">Music Exclusive Team</p>
              <p style="margin: 0; color: #00d4ff; font-size: 12px; font-style: italic;">Where Every Stream Counts and Every Fan Matters.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
    // Send email using verified domain
    const emailResult = await sendResendEmail({
      resendKey,
      from: PRIMARY_FROM,
      replyTo: REPLY_TO,
      to: email,
      subject,
      html,
    });

    if (!emailResult.ok) {
      console.error(`Vault win email failed: ${emailResult.message}`);
      // Don't 500 the app for a non-critical email.
      return new Response(
        JSON.stringify({ success: false, warning: "Email failed to send", error: emailResult.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const responseData = emailResult.data;

    console.log(`Vault win email sent to ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Vault win email sent", data: responseData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Vault win email error:", message);
    return new Response(
      // Avoid blank-screening the app if email fails.
      JSON.stringify({ success: false, error: message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
