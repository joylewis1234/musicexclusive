import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyApplicationRequest {
  applicationId: string;
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

    const { applicationId, baseUrl = "https://id-preview--09644822-430a-4a4e-a068-bdf812a2aedf.lovable.app" }: NotifyApplicationRequest = await req.json();

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

    // Generate secure tokens for approve/deny actions
    const approveToken = crypto.randomUUID();
    const denyToken = crypto.randomUUID();

    // Store tokens in database
    await supabase.from("application_action_tokens").insert([
      {
        application_id: applicationId,
        action_type: "approve",
        token: approveToken,
      },
      {
        application_id: applicationId,
        action_type: "deny",
        token: denyToken,
      },
    ]);

    const approveUrl = `${baseUrl}/admin/artist-applications/approve?token=${approveToken}`;
    const denyUrl = `${baseUrl}/admin/artist-applications/deny?token=${denyToken}`;
    const adminDashboardUrl = `${baseUrl}/admin/artist-applications`;

    // Build the email HTML with Music Exclusive branding
    const emailHtml = `
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
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 40px 30px 30px; text-align: center; border-bottom: 1px solid rgba(139, 92, 246, 0.2);">
              <img src="https://www.themusicisexclusive.com/favicon.png" alt="Music Exclusive" width="56" height="56" style="display: block; margin: 0 auto 16px auto; border-radius: 12px;" />
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: 2px;">
                MUSIC EXCLUSIVE
              </h1>
              <p style="margin: 10px 0 0; color: #a78bfa; font-size: 12px; letter-spacing: 3px; text-transform: uppercase;">
                New Artist Application
              </p>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="padding: 25px 30px;">
              <div style="background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
                <p style="margin: 0; color: #e2e8f0; font-size: 16px; font-weight: 600;">
                  🎵 New Application Received
                </p>
                <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">
                  An artist has applied to join Music Exclusive
                </p>
              </div>
            </td>
          </tr>

          <!-- Artist Info Card -->
          <tr>
            <td style="padding: 0 30px 25px;">
              <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; overflow: hidden;">
                <div style="padding: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                  <h2 style="margin: 0 0 5px; color: #f8fafc; font-size: 22px; font-weight: 700;">
                    ${application.artist_name}
                  </h2>
                  <p style="margin: 0; color: #a78bfa; font-size: 14px;">
                    ${application.contact_email}
                  </p>
                </div>
                
                <div style="padding: 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding: 8px 0;">
                        <span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Location</span>
                        <p style="margin: 4px 0 0; color: #e2e8f0; font-size: 14px;">${application.country_city || "Not specified"}</p>
                      </td>
                      <td style="padding: 8px 0;">
                        <span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Genre(s)</span>
                        <p style="margin: 4px 0 0; color: #e2e8f0; font-size: 14px;">${application.genres}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0;">
                        <span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Experience</span>
                        <p style="margin: 4px 0 0; color: #e2e8f0; font-size: 14px;">${application.years_releasing}</p>
                      </td>
                      <td style="padding: 8px 0;">
                        <span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Followers</span>
                        <p style="margin: 4px 0 0; color: #e2e8f0; font-size: 14px;">${application.follower_count?.toLocaleString() || "N/A"}</p>
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
            </td>
          </tr>

          <!-- Social & Music Links -->
          <tr>
            <td style="padding: 0 30px 25px;">
              <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px;">
                <h3 style="margin: 0 0 15px; color: #a78bfa; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">
                  Links & Samples
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${application.social_profile_url ? `
                  <tr>
                    <td style="padding: 6px 0;">
                      <span style="color: #94a3b8; font-size: 13px;">📱 Social (${application.primary_social_platform}):</span>
                      <a href="${application.social_profile_url}" style="color: #a78bfa; font-size: 13px; text-decoration: none; margin-left: 8px;">View Profile →</a>
                    </td>
                  </tr>` : ""}
                  ${application.spotify_url ? `
                  <tr>
                    <td style="padding: 6px 0;">
                      <span style="color: #94a3b8; font-size: 13px;">🎵 Music Link:</span>
                      <a href="${application.spotify_url}" style="color: #a78bfa; font-size: 13px; text-decoration: none; margin-left: 8px;">Listen →</a>
                    </td>
                  </tr>` : ""}
                  ${application.song_sample_url ? `
                  <tr>
                    <td style="padding: 6px 0;">
                      <span style="color: #94a3b8; font-size: 13px;">🎵 Song Sample:</span>
                      <a href="${application.song_sample_url}" style="color: #a78bfa; font-size: 13px; text-decoration: none; margin-left: 8px;">Listen →</a>
                    </td>
                  </tr>` : ""}
                  ${application.hook_preview_url ? `
                  <tr>
                    <td style="padding: 6px 0;">
                      <span style="color: #94a3b8; font-size: 13px;">🔊 Hook Preview:</span>
                      <a href="${application.hook_preview_url}" style="color: #a78bfa; font-size: 13px; text-decoration: none; margin-left: 8px;">Listen →</a>
                    </td>
                  </tr>` : ""}
                </table>
              </div>
            </td>
          </tr>

          <!-- Action Buttons -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right: 10px;" width="50%">
                    <a href="${approveUrl}" style="display: block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 16px 24px; border-radius: 12px; font-size: 14px; font-weight: 600; text-align: center; letter-spacing: 1px;">
                      ✓ APPROVE ARTIST
                    </a>
                  </td>
                  <td style="padding-left: 10px;" width="50%">
                    <a href="${denyUrl}" style="display: block; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); color: #ef4444; text-decoration: none; padding: 16px 24px; border-radius: 12px; font-size: 14px; font-weight: 600; text-align: center; letter-spacing: 1px;">
                      ✗ DENY
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Dashboard Link -->
          <tr>
            <td style="padding: 0 30px 30px; text-align: center;">
              <a href="${adminDashboardUrl}" style="color: #64748b; font-size: 13px; text-decoration: none;">
                Or review all applications in the Admin Dashboard →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 30px; background: rgba(0, 0, 0, 0.3); border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                This is an automated notification from Music Exclusive.
              </p>
              <p style="margin: 8px 0 0; color: #475569; font-size: 11px;">
                Submitted: ${new Date(application.created_at).toLocaleString()}
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

    // Send email to support - use verified domain
    const emailResult = await resend.emails.send({
      from: "Music Exclusive <noreply@themusicisexclusive.com>",
      reply_to: "support@musicexclusive.co",
      to: ["support@musicexclusive.co"],
      subject: `🎵 New Artist Application: ${application.artist_name}`,
      html: emailHtml,
    });

    console.log("Notification email sent:", emailResult);

    return new Response(
      JSON.stringify({
        success: true,
        applicationId,
        emailSent: true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in notify-new-application:", error);
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
