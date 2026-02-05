import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { verifyAdmin } from "../_shared/verify-admin.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Use production URL by default
const DEFAULT_BASE_URL = "https://musicexclusive.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApproveArtistRequest {
  applicationId: string;
  baseUrl?: string;
  resend?: boolean; // Flag for resending email
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    const { user, error: authError } = await verifyAdmin(authHeader);
    if (authError || !user) {
      console.error("[APPROVE-ARTIST] Auth failed:", authError);
      return new Response(
        JSON.stringify({ success: false, error: authError || "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    console.log("[APPROVE-ARTIST] Authorized admin:", user.email || user.id);
    
    const { applicationId, baseUrl = DEFAULT_BASE_URL, resend: isResend = false }: ApproveArtistRequest = await req.json();

    if (!applicationId) {
      throw new Error("Application ID is required");
    }

    // Fetch the application
    const { data: application, error: fetchError } = await supabase
      .from("artist_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (fetchError || !application) {
      throw new Error("Application not found");
    }

    // Validate artist email
    if (!application.contact_email || !application.contact_email.includes("@")) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing artist email. Cannot send approval email." 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Only update status if not a resend
    if (!isResend) {
      const { error: updateError } = await supabase
        .from("artist_applications")
        .update({ 
          status: "approved_pending_setup",
          updated_at: new Date().toISOString()
        })
        .eq("id", applicationId);

      if (updateError) {
        throw new Error(`Failed to update application: ${updateError.message}`);
      }
    }

    // Generate secure setup link - routes to /artist/signup
    const setupLink = `${baseUrl}/artist/signup?email=${encodeURIComponent(application.contact_email)}`;

    // Create email log entry
    const { data: emailLog, error: logCreateError } = await supabase
      .from("email_logs")
      .insert({
        email_type: "artist_approved",
        recipient_email: application.contact_email,
        application_id: applicationId,
        status: "pending",
      })
      .select()
      .single();

    if (logCreateError) {
      console.error("[APPROVE-ARTIST] Failed to create email log:", logCreateError);
    }

    // Send approval email to artist
    let emailSent = false;
    let emailError: string | null = null;
    let resendId: string | null = null;
    
    try {
      const approvalEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; border: 1px solid rgba(139, 92, 246, 0.3); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 50px 30px; text-align: center; background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.1) 100%);">
              <div style="font-size: 60px; margin-bottom: 20px;">🎉</div>
              <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: #f8fafc; letter-spacing: 1px;">
                You're Approved!
              </h1>
              <p style="margin: 15px 0 0; color: #a78bfa; font-size: 16px; font-weight: 500;">
                Welcome to Music Exclusive, ${application.artist_name}
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 25px; color: #e2e8f0; font-size: 16px; line-height: 1.7;">
                Congratulations! Your application to join <strong style="color: #a78bfa;">Music Exclusive</strong> has been approved. You're now part of an exclusive community of artists connecting directly with their most dedicated fans.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="${setupLink}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 12px; font-size: 16px; font-weight: 700; letter-spacing: 1px; box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);">
                  CREATE YOUR ARTIST ACCOUNT
                </a>
              </div>

              <!-- Next Steps Checklist -->
              <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 25px; margin-top: 30px;">
                <h3 style="margin: 0 0 20px; color: #a78bfa; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">
                  Your Next Steps
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 10px 0;">
                      <span style="display: inline-block; width: 24px; height: 24px; background: rgba(139, 92, 246, 0.2); border-radius: 50%; text-align: center; line-height: 24px; color: #a78bfa; font-size: 12px; margin-right: 12px;">1</span>
                      <span style="color: #e2e8f0; font-size: 14px;">Set up your artist account with a secure password</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <span style="display: inline-block; width: 24px; height: 24px; background: rgba(139, 92, 246, 0.2); border-radius: 50%; text-align: center; line-height: 24px; color: #a78bfa; font-size: 12px; margin-right: 12px;">2</span>
                      <span style="color: #e2e8f0; font-size: 14px;">Upload your first exclusive track</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <span style="display: inline-block; width: 24px; height: 24px; background: rgba(139, 92, 246, 0.2); border-radius: 50%; text-align: center; line-height: 24px; color: #a78bfa; font-size: 12px; margin-right: 12px;">3</span>
                      <span style="color: #e2e8f0; font-size: 14px;">Add cover art and complete your profile</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <span style="display: inline-block; width: 24px; height: 24px; background: rgba(139, 92, 246, 0.2); border-radius: 50%; text-align: center; line-height: 24px; color: #a78bfa; font-size: 12px; margin-right: 12px;">4</span>
                      <span style="color: #e2e8f0; font-size: 14px;">Start inviting fans into the Vault</span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 30px; background: rgba(0, 0, 0, 0.3); border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
              <p style="margin: 0 0 8px; color: #a78bfa; font-size: 14px; font-weight: 600; letter-spacing: 1px;">
                MUSIC EXCLUSIVE
              </p>
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                The future of exclusive music releases
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

      const plainText = `
You're Approved! Welcome to Music Exclusive, ${application.artist_name}

Congratulations! Your application to join Music Exclusive has been approved. You're now part of an exclusive community of artists connecting directly with their most dedicated fans.

Create your artist account here: ${setupLink}

Your Next Steps:
1. Set up your artist account with a secure password
2. Upload your first exclusive track
3. Add cover art and complete your profile
4. Start inviting fans into the Vault

- The Music Exclusive Team
      `;

      console.log("[APPROVE-ARTIST] Attempting to send approval email to:", application.contact_email);

      const emailResult = await resend.emails.send({
        from: "Music Exclusive <noreply@themusicisexclusive.com>",
        reply_to: "support@musicexclusive.co",
        to: [application.contact_email],
        subject: "You're Approved. Welcome to Music Exclusive",
        html: approvalEmailHtml,
        text: plainText,
      });
      
      console.log("[APPROVE-ARTIST] Email send result:", JSON.stringify(emailResult));
      
      if (emailResult.error) {
        throw new Error(emailResult.error.message || "Resend API error");
      }
      
      resendId = emailResult.data?.id || null;
      emailSent = true;
      console.log("[APPROVE-ARTIST] Approval email sent successfully to:", application.contact_email);

      // Update email log as sent
      if (emailLog) {
        await supabase
          .from("email_logs")
          .update({
            status: "sent",
            resend_id: resendId,
            sent_at: new Date().toISOString(),
          })
          .eq("id", emailLog.id);
      }
    } catch (err) {
      emailError = err instanceof Error ? err.message : "Email send failed";
      console.error("[APPROVE-ARTIST] Failed to send approval email:", emailError);

      // Update email log as failed
      if (emailLog) {
        await supabase
          .from("email_logs")
          .update({
            status: "failed",
            error_message: emailError,
          })
          .eq("id", emailLog.id);
      }
    }
    
    console.log("[APPROVE-ARTIST] Artist approved. Setup link:", setupLink);

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
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("[APPROVE-ARTIST] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
