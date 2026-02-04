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
}): Promise<{ ok: true; data?: unknown } | { ok: false; status: number; message: string } > {
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
    // Resend typically returns JSON on success.
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

interface VaultResendRequest {
  email: string;
  name: string;
  vaultCode: string;
  appUrl: string;
  returnUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, vaultCode, appUrl, returnUrl }: VaultResendRequest = await req.json();

    // Validate required fields
    if (!email || !vaultCode) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, vaultCode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const displayName = name || "Vault Member";
    const finalReturnUrl = returnUrl || `${appUrl || 'https://id-preview--09644822-430a-4a4e-a068-bdf812a2aedf.lovable.app'}/vault/submit?email=${encodeURIComponent(email)}&code=${encodeURIComponent(vaultCode)}`;

    const subject = "🔐 Your Music Exclusive Vault Code";
    const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Vault Code</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
                    
                    <!-- Header with Logo -->
                    <tr>
                      <td align="center" style="padding-bottom: 30px;">
                        <img src="https://www.themusicisexclusive.com/favicon.png" alt="Music Exclusive" width="48" height="48" style="display: block; margin: 0 auto 16px auto; border-radius: 8px;" />
                        <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #ffffff; letter-spacing: 0.1em; text-transform: uppercase;">
                          MUSIC EXCLUSIVE™
                        </h1>
                      </td>
                    </tr>

                    <!-- Main Card -->
                    <tr>
                      <td style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(20, 20, 20, 1) 50%, rgba(0, 212, 255, 0.1) 100%); border-radius: 16px; border: 1px solid rgba(139, 92, 246, 0.3); padding: 40px 30px;">
                        
                        <!-- Greeting -->
                        <p style="margin: 0 0 20px 0; font-size: 16px; color: #a1a1aa; line-height: 1.6;">
                          Hey ${displayName}!
                        </p>
                        
                        <p style="margin: 0 0 30px 0; font-size: 16px; color: #a1a1aa; line-height: 1.6;">
                          Here's your Vault Code as requested:
                        </p>

                        <!-- Vault Code Box -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                          <tr>
                            <td align="center">
                              <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(0, 212, 255, 0.1)); border: 2px solid rgba(139, 92, 246, 0.5); border-radius: 12px; padding: 20px 40px; display: inline-block;">
                                <span style="font-size: 36px; font-weight: bold; color: #ffffff; letter-spacing: 0.3em; text-shadow: 0 0 20px rgba(139, 92, 246, 0.5);">
                                  ${vaultCode}
                                </span>
                              </div>
                            </td>
                          </tr>
                        </table>

                        <!-- Divider -->
                        <div style="height: 1px; background: linear-gradient(to right, transparent, rgba(139, 92, 246, 0.4), transparent); margin: 30px 0;"></div>

                        <!-- Return link -->
                        <p style="margin: 0 0 20px 0; font-size: 14px; color: #a1a1aa; line-height: 1.6; text-align: center;">
                          Ready to check your status? Click below:
                        </p>

                        <!-- CTA Button -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center">
                              <a href="${finalReturnUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #00d4ff); color: #000000; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase;">
                                RETURN TO VAULT
                              </a>
                            </td>
                          </tr>
                        </table>

                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td align="center" style="padding-top: 30px;">
                        <p style="margin: 0; font-size: 12px; color: #52525b; line-height: 1.6;">
                          Keep this code safe — you'll need it to check your Vault status.
                        </p>
                        <p style="margin: 10px 0 0 0; font-size: 11px; color: #3f3f46;">
                          © Music Exclusive™ — Where every stream counts.
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
      console.error(`Vault resend email failed: ${emailResult.message}`);
      return new Response(
        JSON.stringify({ success: false, warning: "Email failed to send", error: emailResult.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const responseData = emailResult.data;

    console.log("Vault resend email sent successfully:", responseData ?? "(no json)");

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-vault-resend-email function:", error);
    return new Response(
      // Avoid blank-screening the app if email fails.
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
