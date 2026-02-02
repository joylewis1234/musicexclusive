import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ActionRequest {
  token: string;
  adminEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  baseUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, adminEmail, ipAddress, userAgent, baseUrl = "https://id-preview--09644822-430a-4a4e-a068-bdf812a2aedf.lovable.app" }: ActionRequest = await req.json();

    if (!token) {
      throw new Error("Token is required");
    }

    // Fetch the token record
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("application_action_tokens")
      .select("*, artist_applications(*)")
      .eq("token", token)
      .maybeSingle();

    if (tokenError || !tokenRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or expired token. Please request a new action link.",
        }),
        {
          status: 200,  // Return 200 so frontend can read the error
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (tokenRecord.used_at) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This action has already been completed. The artist has already been notified.",
          alreadyCompleted: true,
        }),
        {
          status: 200,  // Return 200 so frontend can read the error
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This token has expired. Please request a new action link.",
        }),
        {
          status: 200,  // Return 200 so frontend can read the error
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const application = tokenRecord.artist_applications;
    const actionType = tokenRecord.action_type;

    // Mark token as used
    await supabase
      .from("application_action_tokens")
      .update({
        used_at: new Date().toISOString(),
        used_by: adminEmail || "email_link",
      })
      .eq("id", tokenRecord.id);

    // Log the admin action
    await supabase.from("admin_action_logs").insert({
      action_type: actionType === "approve" ? "artist_approved" : "artist_denied",
      target_type: "artist_application",
      target_id: application.id,
      admin_email: adminEmail || "email_link",
      details: {
        artist_name: application.artist_name,
        artist_email: application.contact_email,
        token_used: token.substring(0, 8) + "...",
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (actionType === "approve") {
      // Update application status
      await supabase
        .from("artist_applications")
        .update({
          status: "approved_pending_setup",
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      // Send approval email to artist
      const setupLink = `${baseUrl}/artist/setup-account?email=${encodeURIComponent(application.contact_email)}`;

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
                  SET UP MY ARTIST ACCOUNT
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

      console.log("Attempting to send approval email to:", application.contact_email);
      
      const emailResult = await resend.emails.send({
        from: "Music Exclusive <noreply@themusicisexclusive.com>",
        reply_to: "support@musicexclusive.co",
        to: [application.contact_email],
        subject: "Your Music Exclusive Artist Application Was Approved 🎉",
        html: approvalEmailHtml,
      });
      
      console.log("Approval email result:", JSON.stringify(emailResult));

      return new Response(
        JSON.stringify({
          success: true,
          action: "approved",
          artistName: application.artist_name,
          artistEmail: application.contact_email,
          setupLink,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      // Deny action
      await supabase
        .from("artist_applications")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      // Send denial email to artist
      const reapplyLink = `${baseUrl}/artist/apply`;

      const denialEmailHtml = `
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
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; border: 1px solid rgba(100, 116, 139, 0.3); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 50px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: 2px;">
                MUSIC EXCLUSIVE
              </h1>
              <p style="margin: 15px 0 0; color: #94a3b8; font-size: 14px; letter-spacing: 1px;">
                Application Update
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 0 30px 40px;">
              <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 16px; line-height: 1.7;">
                Hi ${application.artist_name},
              </p>
              <p style="margin: 0 0 20px; color: #cbd5e1; font-size: 15px; line-height: 1.7;">
                Thank you for your interest in joining Music Exclusive. After careful consideration, we've decided not to move forward with your application at this time.
              </p>
              <p style="margin: 0 0 25px; color: #cbd5e1; font-size: 15px; line-height: 1.7;">
                This doesn't mean never — we encourage you to keep building your fanbase, refining your sound, and growing your presence. We'd love to hear from you again in the future.
              </p>

              <!-- Encouragement Box -->
              <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px; padding: 25px; margin: 30px 0;">
                <p style="margin: 0; color: #a78bfa; font-size: 14px; line-height: 1.7; text-align: center;">
                  💜 Keep creating. Keep growing. We believe in you.
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 30px;">
                <a href="${reapplyLink}" style="display: inline-block; background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4); color: #a78bfa; text-decoration: none; padding: 16px 35px; border-radius: 12px; font-size: 14px; font-weight: 600; letter-spacing: 1px;">
                  REAPPLY IN THE FUTURE
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 30px; background: rgba(0, 0, 0, 0.3); border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                Thank you for your understanding.
              </p>
              <p style="margin: 8px 0 0; color: #475569; font-size: 11px;">
                — The Music Exclusive Team
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

      await resend.emails.send({
        from: "Music Exclusive <noreply@themusicisexclusive.com>",
        reply_to: "support@musicexclusive.co",
        to: [application.contact_email],
        subject: "Music Exclusive Artist Application Update",
        html: denialEmailHtml,
      });

      return new Response(
        JSON.stringify({
          success: true,
          action: "denied",
          artistName: application.artist_name,
          artistEmail: application.contact_email,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error) {
    console.error("Error in handle-application-action:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
