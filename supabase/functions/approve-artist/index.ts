import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { Resend } from "npm:resend@2.0.0";

const VERSION = "v4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

const DEFAULT_BASE_URL = "https://themusicisexclusive.com";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (url.pathname.endsWith("/health") || req.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, version: VERSION, timestamp: new Date().toISOString() }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  console.log(`[APPROVE-ARTIST ${VERSION}] POST request received`);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ─── Step 1: Verify admin ───────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Authorization header", _version: VERSION }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired token", _version: VERSION }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const adminUserId = userData.user.id;

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden - Admin access required", _version: VERSION }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[APPROVE-ARTIST ${VERSION}] Authorized admin:`, userData.user.email);

    // ─── Step 2: Parse body ─────────────────────────────────────
    const body = await req.json();
    const applicationId = body.applicationId;
    const isResend = body.resend === true;

    if (!applicationId) {
      return new Response(
        JSON.stringify({ success: false, error: "applicationId is required", _version: VERSION }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ─── Step 3: Fetch application ──────────────────────────────
    const { data: application, error: fetchError } = await supabase
      .from("artist_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (fetchError || !application) {
      return new Response(
        JSON.stringify({ success: false, error: "Application not found", _version: VERSION }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ─── Step 4: Update DB status with approval metadata ────────
    if (!isResend) {
      const { error: updateError } = await supabase
        .from("artist_applications")
        .update({
          status: "approved_pending_setup",
          approved_at: new Date().toISOString(),
          approved_by: adminUserId,
          approved_application_id: applicationId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      if (updateError) {
        console.error(`[APPROVE-ARTIST ${VERSION}] DB update failed:`, updateError.message);
        return new Response(
          JSON.stringify({ success: false, error: `DB update failed: ${updateError.message}`, _version: VERSION }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log(`[APPROVE-ARTIST ${VERSION}] ✅ DB status updated to approved_pending_setup with metadata`);
    }

    // ─── Email is best-effort below ─────────────────────────────

    if (!application.contact_email || !application.contact_email.includes("@")) {
      return new Response(
        JSON.stringify({
          success: true,
          applicationId,
          artistName: application.artist_name,
          emailSent: false,
          emailError: "Missing or invalid artist email",
          _version: VERSION,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ─── Step 5: Send email (non-blocking) ──────────────────────
    const setupLink = `${DEFAULT_BASE_URL}/artist/signup?application_id=${applicationId}&email=${encodeURIComponent(application.contact_email)}`;
    let emailSent = false;
    let emailError: string | null = null;
    let resendId: string | null = null;

    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

      const resendClient = new Resend(resendApiKey);
      const emailResult = await resendClient.emails.send({
        from: "Music Exclusive <noreply@themusicisexclusive.com>",
        reply_to: "support@musicexclusive.co",
        to: [application.contact_email],
        subject: "You're Approved. Welcome to Music Exclusive",
        html: buildApprovalEmailHtml(application.artist_name, setupLink),
        text: buildApprovalEmailText(application.artist_name, setupLink),
      });

      if (emailResult.error) {
        throw new Error(emailResult.error.message || "Resend API error");
      }

      resendId = emailResult.data?.id || null;
      emailSent = true;
      console.log(`[APPROVE-ARTIST ${VERSION}] ✅ Email sent. Resend ID:`, resendId);
    } catch (err) {
      emailError = err instanceof Error ? err.message : "Email send failed";
      console.error(`[APPROVE-ARTIST ${VERSION}] ⚠️ Email failed (non-blocking):`, emailError);
    }

    // ─── Step 6: Log email result ───────────────────────────────
    try {
      await supabase.from("email_logs").insert({
        email_type: "artist_approved",
        recipient_email: application.contact_email,
        application_id: applicationId,
        status: emailSent ? "sent" : "failed",
        error_message: emailError,
        resend_id: resendId,
        sent_at: emailSent ? new Date().toISOString() : null,
      });
    } catch (logErr) {
      console.error(`[APPROVE-ARTIST ${VERSION}] Email log insert failed:`, logErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        applicationId,
        artistName: application.artist_name,
        email: application.contact_email,
        setupLink,
        emailSent,
        emailError,
        resendId,
        approved_at: new Date().toISOString(),
        approved_by: adminUserId,
        _version: VERSION,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error(`[APPROVE-ARTIST ${VERSION}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        _version: VERSION,
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

// ─── Email Templates ─────────────────────────────────────────────

function buildApprovalEmailHtml(artistName: string, setupLink: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;border:1px solid rgba(139,92,246,0.3);overflow:hidden;">
<tr><td style="padding:50px 30px;text-align:center;background:linear-gradient(135deg,rgba(139,92,246,0.2) 0%,rgba(124,58,237,0.1) 100%);">
<div style="font-size:60px;margin-bottom:20px;">🎉</div>
<h1 style="margin:0;font-size:32px;font-weight:800;color:#f8fafc;letter-spacing:1px;">You're Approved!</h1>
<p style="margin:15px 0 0;color:#a78bfa;font-size:16px;font-weight:500;">Welcome to Music Exclusive, ${artistName}</p>
</td></tr>
<tr><td style="padding:40px 30px;">
<p style="margin:0 0 25px;color:#e2e8f0;font-size:16px;line-height:1.7;">Congratulations! Your application to join <strong style="color:#a78bfa;">Music Exclusive</strong> has been approved.</p>
<div style="text-align:center;margin:35px 0;">
<a href="${setupLink}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%);color:#ffffff;text-decoration:none;padding:18px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:1px;box-shadow:0 4px 20px rgba(139,92,246,0.4);">CREATE YOUR ARTIST ACCOUNT</a>
</div>
<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:25px;margin-top:30px;">
<h3 style="margin:0 0 20px;color:#a78bfa;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Your Next Steps</h3>
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:10px 0;"><span style="display:inline-block;width:24px;height:24px;background:rgba(139,92,246,0.2);border-radius:50%;text-align:center;line-height:24px;color:#a78bfa;font-size:12px;margin-right:12px;">1</span><span style="color:#e2e8f0;font-size:14px;">Set up your artist account with a secure password</span></td></tr>
<tr><td style="padding:10px 0;"><span style="display:inline-block;width:24px;height:24px;background:rgba(139,92,246,0.2);border-radius:50%;text-align:center;line-height:24px;color:#a78bfa;font-size:12px;margin-right:12px;">2</span><span style="color:#e2e8f0;font-size:14px;">Upload your first exclusive track</span></td></tr>
<tr><td style="padding:10px 0;"><span style="display:inline-block;width:24px;height:24px;background:rgba(139,92,246,0.2);border-radius:50%;text-align:center;line-height:24px;color:#a78bfa;font-size:12px;margin-right:12px;">3</span><span style="color:#e2e8f0;font-size:14px;">Add cover art and complete your profile</span></td></tr>
<tr><td style="padding:10px 0;"><span style="display:inline-block;width:24px;height:24px;background:rgba(139,92,246,0.2);border-radius:50%;text-align:center;line-height:24px;color:#a78bfa;font-size:12px;margin-right:12px;">4</span><span style="color:#e2e8f0;font-size:14px;">Start inviting fans into the Vault</span></td></tr>
</table></div>
</td></tr>
<tr><td style="padding:25px 30px;background:rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
<p style="margin:0 0 8px;color:#a78bfa;font-size:14px;font-weight:600;letter-spacing:1px;">MUSIC EXCLUSIVE</p>
<p style="margin:0;color:#64748b;font-size:12px;">The future of exclusive music releases</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

function buildApprovalEmailText(artistName: string, setupLink: string): string {
  return `You're Approved! Welcome to Music Exclusive, ${artistName}

Congratulations! Your application to join Music Exclusive has been approved.

Create your artist account here: ${setupLink}

Your Next Steps:
1. Set up your artist account with a secure password
2. Upload your first exclusive track
3. Add cover art and complete your profile
4. Start inviting fans into the Vault

- The Music Exclusive Team`;
}
