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
const DEFAULT_APP_URL = Deno.env.get("APP_URL") || "https://musicexclusive.co";

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

interface VaultRetryWinRequest {
  email: string;
  name: string;
  vaultCode: string;
  appUrl?: string;
}

function buildRetryWinEmailHtml(
  name: string,
  email: string,
  vaultCode: string,
  loginLink: string,
  resetPasswordLink: string
): string {
  return `
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
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: linear-gradient(145deg, rgba(251, 191, 36, 0.1), rgba(0, 212, 255, 0.08), rgba(139, 92, 246, 0.08)); border-radius: 20px; border: 1px solid rgba(251, 191, 36, 0.3); padding: 48px 40px;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; letter-spacing: 3px; color: #fbbf24; text-transform: uppercase;">The Wait Is Over</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 1px;">🗝️ You Finally Made It In!</h1>
              <p style="margin: 12px 0 0 0; color: #fbbf24; font-size: 18px; font-weight: 500;">Vault Access Granted 🎉</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="margin: 0; color: #ffffff; font-size: 18px;">Hi ${name},</p>
            </td>
          </tr>

          <!-- Big News -->
          <tr>
            <td style="padding-bottom: 28px;">
              <p style="margin: 0 0 16px 0; color: #fbbf24; font-size: 22px; font-weight: 700;">
                🎉 BIG NEWS… YOU'RE IN!
              </p>
              <p style="margin: 0 0 16px 0; color: #b8b8c0; font-size: 16px; line-height: 1.7;">
                After trying before, you've officially been <strong style="color: #ffffff;">selected and granted Vault Access</strong> to Music Exclusive.
              </p>
              <p style="margin: 0; color: #b8b8c0; font-size: 16px; line-height: 1.7;">
                This is your moment — because inside the Vault is where artists drop music <strong style="color: #00d4ff;">FIRST</strong>.<br>
                You're getting access to <strong style="color: #ffffff;">exclusive music the rest of the world hasn't heard yet</strong> — before it hits Spotify, Apple Music, and everywhere else.
              </p>
            </td>
          </tr>

          <!-- Vault Claim Details -->
          <tr>
            <td style="padding-bottom: 32px;">
              <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(251, 191, 36, 0.25); border-radius: 16px; padding: 24px;">
                <p style="margin: 0 0 16px 0; color: #fbbf24; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">🔐 Your Vault Claim Details</p>
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
                      <span style="color: #fbbf24; font-size: 20px; font-weight: 700; letter-spacing: 6px; margin-left: 8px; font-family: monospace;">${vaultCode}</span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Claim Access -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">✅ Claim Your Access Now</p>
              <a href="${loginLink}" style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #00d4ff 100%); color: #000000; font-size: 16px; font-weight: 700; text-decoration: none; padding: 18px 48px; border-radius: 12px; letter-spacing: 1px; text-transform: uppercase;">
                CLAIM YOUR ACCESS
              </a>
            </td>
          </tr>

          <!-- Reset Password Section -->
          <tr>
            <td style="padding-bottom: 32px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px;">
              <p style="margin: 0 0 12px 0; color: #888; font-size: 14px;">🔁 Already claimed your account?</p>
              <p style="margin: 0 0 16px 0; color: #666; font-size: 13px;">If you've already created your account, reset your password here anytime:</p>
              <a href="${resetPasswordLink}" style="color: #8b5cf6; font-size: 14px; text-decoration: underline;">Create / Reset Password →</a>
            </td>
          </tr>

          <!-- Closing -->
          <tr>
            <td style="padding-top: 16px; border-top: 1px solid rgba(251, 191, 36, 0.2);">
              <p style="margin: 0 0 8px 0; color: #b8b8c0; font-size: 15px; line-height: 1.7;">
                Thank you for being patient and staying with us.<br>
                Now it's time to experience the future of music — <strong style="color: #fbbf24;">early, exclusive, and made for superfans like you</strong> 💎🎶
              </p>
              <p style="margin: 24px 0 4px 0; color: #888; font-size: 14px;">Welcome inside,</p>
              <p style="margin: 0 0 4px 0; color: #ffffff; font-size: 15px; font-weight: 600;">Music Exclusive Team</p>
              <p style="margin: 0; color: #fbbf24; font-size: 12px; font-style: italic;">Where Every Stream Counts and Every Fan Matters.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, vaultCode, appUrl }: VaultRetryWinRequest = await req.json();

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

    const baseUrl = appUrl || DEFAULT_APP_URL;
    const loginLink = `${baseUrl}/vault/congrats?email=${encodeURIComponent(email)}&code=${encodeURIComponent(vaultCode)}&retry=true`;
    const resetPasswordLink = `${baseUrl}/forgot-password?email=${encodeURIComponent(email)}`;

    const subject = "🗝️ You Finally Made It In! Vault Access Granted 🎉";
    const html = buildRetryWinEmailHtml(name, email, vaultCode, loginLink, resetPasswordLink);

    const emailResult = await sendResendEmail({
      resendKey,
      from: PRIMARY_FROM,
      replyTo: REPLY_TO,
      to: email,
      subject,
      html,
    });

    if (!emailResult.ok) {
      console.error(`Vault retry win email failed: ${emailResult.message}`);
      return new Response(
        JSON.stringify({ success: false, warning: "Email failed to send", error: emailResult.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const responseData = emailResult.data;

    console.log(`Vault retry win email sent to ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Vault retry win email sent", data: responseData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Vault retry win email error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
