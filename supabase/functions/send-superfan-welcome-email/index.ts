import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const PRIMARY_FROM = "Music Exclusive <noreply@themusicisexclusive.com>";
const REPLY_TO = "support@musicexclusive.co";

interface SuperfanWelcomeRequest {
  email: string;
  name?: string;
  appUrl?: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[SEND-SUPERFAN-WELCOME] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

function buildSuperfanWelcomeHtml(name: string, email: string, vaultCode: string, loginLink: string, inviteLink: string): string {
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
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: linear-gradient(145deg, rgba(0, 212, 255, 0.08), rgba(251, 191, 36, 0.05), rgba(0, 212, 255, 0.03)); border-radius: 20px; border: 1px solid rgba(0, 212, 255, 0.25); padding: 48px 40px;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 12px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                MUSIC EXCLUSIVE™
              </h1>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <h2 style="margin: 0; color: #fbbf24; font-size: 26px; font-weight: 700;">
                Welcome, Superfan! 👑
              </h2>
              <p style="margin: 12px 0 0 0; color: #00d4ff; font-size: 16px;">Your premium membership is now active</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="margin: 0; color: #ffffff; font-size: 18px;">Hi ${name},</p>
              <p style="margin: 12px 0 0 0; color: #b8b8c0; font-size: 16px; line-height: 1.7;">
                Thank you for becoming a <strong style="color: #fbbf24;">Superfan Member</strong>! You now have instant, guaranteed access to Music Exclusive — no lottery needed. 🎶
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding-bottom: 28px;">
              <div style="height: 1px; background: linear-gradient(to right, transparent, rgba(0, 212, 255, 0.4), transparent);"></div>
            </td>
          </tr>

          <!-- Benefits Section -->
          <tr>
            <td style="padding-bottom: 28px;">
              <p style="margin: 0 0 16px 0; color: #00d4ff; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
                👑 Your Superfan Benefits
              </p>
              <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(0, 212, 255, 0.15); border-radius: 16px; padding: 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding: 10px 0; color: #ffffff; font-size: 15px; line-height: 1.6;">✅ <strong>Guaranteed Vault Access</strong> — No lottery required</td></tr>
                  <tr><td style="padding: 10px 0; color: #ffffff; font-size: 15px; line-height: 1.6;">✅ <strong>25 Monthly Credits</strong> — Stream 25 exclusive songs per month</td></tr>
                  <tr><td style="padding: 10px 0; color: #ffffff; font-size: 15px; line-height: 1.6;">✅ <strong>Early Access to Music</strong> — Hear tracks before they drop anywhere else</td></tr>
                  <tr><td style="padding: 10px 0; color: #ffffff; font-size: 15px; line-height: 1.6;">✅ <strong>Support Artists Directly</strong> — Every stream pays artists fairly</td></tr>
                  <tr><td style="padding: 10px 0; color: #ffffff; font-size: 15px; line-height: 1.6;">✅ <strong>Superfan Badge</strong> — Stand out as a premium member</td></tr>
                  <tr><td style="padding: 10px 0; color: #ffffff; font-size: 15px; line-height: 1.6;">✅ <strong>1 Monthly Invite</strong> — Share access with a friend each month</td></tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Monthly Terms -->
          <tr>
            <td style="padding-bottom: 28px;">
              <p style="margin: 0 0 16px 0; color: #00d4ff; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
                📋 Your Monthly Membership Terms
              </p>
              <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(251, 191, 36, 0.15); border-radius: 16px; padding: 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding: 8px 0; color: #b8b8c0; font-size: 14px; line-height: 1.6;"><strong style="color: #ffffff;">Monthly Fee:</strong> $5.00/month</td></tr>
                  <tr><td style="padding: 8px 0; color: #b8b8c0; font-size: 14px; line-height: 1.6;"><strong style="color: #ffffff;">Monthly Credits:</strong> 25 credits (reset each billing cycle)</td></tr>
                  <tr><td style="padding: 8px 0; color: #b8b8c0; font-size: 14px; line-height: 1.6;"><strong style="color: #ffffff;">Credit Value:</strong> 1 credit = 1 exclusive stream ($0.20 value)</td></tr>
                  <tr><td style="padding: 8px 0; color: #b8b8c0; font-size: 14px; line-height: 1.6;"><strong style="color: #ffffff;">Credit Rollover:</strong> Credits do not roll over — they reset monthly</td></tr>
                  <tr><td style="padding: 8px 0; color: #b8b8c0; font-size: 14px; line-height: 1.6;"><strong style="color: #ffffff;">Cancellation:</strong> Cancel anytime — access continues until end of billing period</td></tr>
                  <tr><td style="padding: 8px 0; color: #b8b8c0; font-size: 14px; line-height: 1.6;"><strong style="color: #ffffff;">Refund Policy:</strong> All sales are final per our Terms of Use</td></tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Vault Access Details -->
          <tr>
            <td style="padding-bottom: 28px;">
              <p style="margin: 0 0 16px 0; color: #00d4ff; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
                🔐 Your Vault Access Details
              </p>
              <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(0, 212, 255, 0.2); border-radius: 16px; padding: 24px;">
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

          <!-- Invite Link Section -->
          <tr>
            <td style="padding-bottom: 28px;">
              <p style="margin: 0 0 16px 0; color: #00d4ff; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
                🎟️ Your Exclusive Invite
              </p>
              <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 16px; padding: 24px;">
                <p style="margin: 0 0 8px 0; color: #ffffff; font-size: 15px; line-height: 1.6;">
                  As a Superfan, you get <strong style="color: #fbbf24;">one exclusive invite</strong> each month. Share this link with a friend to give them direct access — no lottery needed!
                </p>
                <p style="margin: 12px 0 0 0; word-break: break-all;">
                  <a href="${inviteLink}" style="color: #00d4ff; font-size: 14px; text-decoration: underline;">${inviteLink}</a>
                </p>
                <p style="margin: 12px 0 0 0; color: #888; font-size: 12px;">
                  ⚠️ Single-use · Expires in 30 days · Your friend still needs to create an account and choose a membership.
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">🎵 Start Listening Now</p>
              <a href="${loginLink}" style="display: inline-block; background: linear-gradient(135deg, #00d4ff 0%, #0ea5e9 50%, #06b6d4 100%); color: #000000; font-size: 16px; font-weight: 700; text-decoration: none; padding: 18px 48px; border-radius: 12px; letter-spacing: 1px; text-transform: uppercase;">
                LOG IN TO MUSIC EXCLUSIVE
              </a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding-bottom: 24px;">
              <div style="height: 1px; background: linear-gradient(to right, transparent, rgba(0, 212, 255, 0.3), transparent);"></div>
            </td>
          </tr>

          <!-- Closing -->
          <tr>
            <td style="padding-top: 8px;">
              <p style="margin: 0 0 8px 0; color: #b8b8c0; font-size: 15px; line-height: 1.7;">
                You're officially part of something special.<br>
                Welcome to the inner circle 🗝️🎶
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
}

async function getOrCreateVaultMemberIdByEmail(supabase: any, email: string): Promise<string> {
  const normalized = email.toLowerCase().trim();

  const { data: existing } = await supabase
    .from("vault_members")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error: createErr } = await supabase
    .from("vault_members")
    .insert({
      email: normalized,
      display_name: normalized.split("@")[0],
      credits: 0,
      vault_access_active: false,
    })
    .select("id")
    .single();

  if (createErr || !created?.id) {
    throw new Error("Failed to create vault_members row for inviter: " + (createErr?.message || "unknown"));
  }

  return created.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, appUrl }: SuperfanWelcomeRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing required field: email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Starting", { email });

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up the fan's vault code
    const { data: vaultEntry } = await supabase
      .from("vault_codes")
      .select("code, name")
      .eq("email", email.toLowerCase().trim())
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const vaultCode = vaultEntry?.code || "N/A";
    const displayName = name || vaultEntry?.name || email.split("@")[0];

    const baseUrl = appUrl || "https://themusicisexclusive.com";
    const loginLink = `${baseUrl}/auth/fan?email=${encodeURIComponent(email)}`;

    // Ensure vault_members row exists and get stable UUID for inviter_id
    const inviterId = await getOrCreateVaultMemberIdByEmail(supabase, email);

    // Generate the Superfan invite token
    const inviteTokenBytes = new Uint8Array(32);
    crypto.getRandomValues(inviteTokenBytes);
    const inviteToken = Array.from(inviteTokenBytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const inviteLink = `${baseUrl}/invite?token=${inviteToken}&type=superfan`;

    // Insert the invite into fan_invites
    const { error: inviteErr } = await supabase
      .from("fan_invites")
      .insert({
        token: inviteToken,
        inviter_id: inviterId,
        inviter_type: "superfan",
        status: "unused",
        expires_at: expiresAt,
      });

    if (inviteErr) {
      logStep("Failed to create invite (non-fatal)", { error: inviteErr.message });
    } else {
      logStep("Invite created", { token: inviteToken.substring(0, 8) + "..." });
    }

    // Build and send the email with invite link included
    const subject = "👑 Welcome, Superfan! Your Premium Membership Is Active";
    const html = buildSuperfanWelcomeHtml(displayName, email, vaultCode, loginLink, inviteLink);

    const emailResponse = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: PRIMARY_FROM,
        reply_to: REPLY_TO,
        to: [email],
        subject,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      logStep("Email send failed", { error: errorText });
      return new Response(
        JSON.stringify({ success: false, warning: "Email failed to send", error: errorText }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Superfan welcome email sent with invite link", { email });

    return new Response(
      JSON.stringify({ success: true, message: "Superfan welcome email sent", inviteLink }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message });
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
