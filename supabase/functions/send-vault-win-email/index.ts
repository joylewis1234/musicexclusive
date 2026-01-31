import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VaultWinRequest {
  email: string;
  name: string;
  vaultCode: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, vaultCode }: VaultWinRequest = await req.json();

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

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Music Exclusive <onboarding@resend.dev>",
        to: [email],
        subject: "🎉 You're In! Your Vault Access Code",
        html: `
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
                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(128, 0, 255, 0.1)); border-radius: 16px; border: 1px solid rgba(0, 212, 255, 0.3); padding: 40px;">
                    <tr>
                      <td align="center" style="padding-bottom: 30px;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; letter-spacing: 2px;">🎉 CONGRATULATIONS</h1>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom: 20px;">
                        <p style="margin: 0; color: #00d4ff; font-size: 18px; letter-spacing: 1px;">Hey ${name}!</p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom: 30px;">
                        <p style="margin: 0; color: #a0a0a0; font-size: 16px; line-height: 1.6;">
                          You've been selected for exclusive access to <strong style="color: #ffffff;">Music Exclusive™</strong> — a private space where fans hear music before it hits Spotify or Apple Music.
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
                        <div style="background: rgba(0, 212, 255, 0.15); border: 2px solid rgba(0, 212, 255, 0.5); border-radius: 12px; padding: 20px 40px; display: inline-block;">
                          <span style="font-size: 36px; font-weight: bold; color: #00d4ff; letter-spacing: 12px; font-family: monospace;">${vaultCode}</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom: 30px;">
                        <p style="margin: 0; color: #a0a0a0; font-size: 14px; line-height: 1.6;">
                          Keep this code safe — it's your key to the Vault.<br>
                          Use it to complete your registration when you're ready.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center">
                        <p style="margin: 0; color: #606060; font-size: 12px;">
                          This code expires 30 minutes after issue.
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
      const errorData = await emailResponse.json();
      throw new Error(errorData.message || "Failed to send email");
    }

    console.log(`Vault win email sent to ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Vault win email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Vault win email error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
