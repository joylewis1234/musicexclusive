// System-level function to generate a Superfan invite and optionally send it via email.
// Called by stripe-webhook on subscription renewal.
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

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[GENERATE-SUPERFAN-INVITE] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function buildMonthlyInviteEmailHtml(name: string, inviteLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#050508;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#050508;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:linear-gradient(145deg,rgba(0,212,255,0.08),rgba(251,191,36,0.05),rgba(0,212,255,0.03));border-radius:20px;border:1px solid rgba(0,212,255,0.25);padding:48px 40px;">
        <tr><td align="center" style="padding-bottom:12px;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">MUSIC EXCLUSIVE™</h1>
        </td></tr>
        <tr><td align="center" style="padding-bottom:32px;">
          <h2 style="margin:0;color:#fbbf24;font-size:26px;font-weight:700;">Your Monthly Superfan Invite 👑</h2>
          <p style="margin:12px 0 0 0;color:#00d4ff;font-size:16px;">Share the love — invite a friend into the Vault</p>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="margin:0;color:#fff;font-size:18px;">Hi ${name},</p>
          <p style="margin:12px 0 0 0;color:#b8b8c0;font-size:16px;line-height:1.7;">
            As an active Superfan, you get <strong style="color:#fbbf24;">one exclusive invite</strong> each month. Share this link with a friend to give them direct access to Music Exclusive — no lottery needed!
          </p>
        </td></tr>
        <tr><td style="padding-bottom:28px;">
          <div style="height:1px;background:linear-gradient(to right,transparent,rgba(0,212,255,0.4),transparent);"></div>
        </td></tr>
        <tr><td style="padding-bottom:28px;">
          <p style="margin:0 0 16px 0;color:#00d4ff;font-size:14px;text-transform:uppercase;letter-spacing:2px;font-weight:600;">🎟️ Your Invite Link</p>
          <div style="background:rgba(0,0,0,0.4);border:1px solid rgba(0,212,255,0.2);border-radius:16px;padding:24px;">
            <p style="margin:0;color:#b8b8c0;font-size:14px;line-height:1.6;">Send this link to your friend:</p>
            <p style="margin:12px 0 0 0;word-break:break-all;">
              <a href="${inviteLink}" style="color:#00d4ff;font-size:14px;text-decoration:underline;">${inviteLink}</a>
            </p>
          </div>
        </td></tr>
        <tr><td style="padding-bottom:28px;">
          <div style="background:rgba(0,0,0,0.3);border:1px solid rgba(251,191,36,0.15);border-radius:12px;padding:16px;">
            <p style="margin:0;color:#b8b8c0;font-size:13px;line-height:1.6;">
              ⚠️ This invite is <strong style="color:#fff;">single-use</strong> and expires in 30 days. Your friend will still need to create an account and choose a membership.
            </p>
          </div>
        </td></tr>
        <tr><td style="padding-top:8px;">
          <p style="margin:24px 0 4px 0;color:#888;font-size:14px;">With love,</p>
          <p style="margin:0 0 4px 0;color:#fff;font-size:15px;font-weight:600;">Music Exclusive Team</p>
          <p style="margin:0;color:#00d4ff;font-size:12px;font-style:italic;">Where Every Stream Counts and Every Fan Matters.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { email, sendEmail, isRenewal } = await req.json();
    if (!email) throw new Error("Missing email");

    logStep("Starting", { email, sendEmail, isRenewal });

    // Look up vault_members.id by email (stable identity, no auth.admin.listUsers)
    const { data: vm } = await supabaseAdmin
      .from("vault_members")
      .select("id, display_name")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    const inviterId = vm?.id || email; // fallback to email if no vault_members row
    const displayName = vm?.display_name || email.split("@")[0];

    // Generate invite token
    const inviteToken = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const baseUrl = "https://musicexclusive.lovable.app";
    const inviteLink = `${baseUrl}/invite?token=${inviteToken}&type=superfan`;

    const { error: insertErr } = await supabaseAdmin
      .from("fan_invites")
      .insert({
        token: inviteToken,
        inviter_id: inviterId,
        inviter_type: "superfan",
        status: "unused",
        expires_at: expiresAt,
      });

    if (insertErr) throw new Error("Failed to create invite: " + insertErr.message);

    logStep("Invite created", { inviterId, token: inviteToken.substring(0, 8) + "..." });

    // Send email if requested (renewal emails)
    if (sendEmail && isRenewal) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const html = buildMonthlyInviteEmailHtml(displayName, inviteLink);
        const emailRes = await fetch(RESEND_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: PRIMARY_FROM,
            reply_to: REPLY_TO,
            to: [email],
            subject: "🎟️ Your Monthly Superfan Invite Is Ready!",
            html,
          }),
        });

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          logStep("Email send failed", { error: errText });
        } else {
          logStep("Monthly invite email sent", { email });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, inviteLink, token: inviteToken }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message });
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
