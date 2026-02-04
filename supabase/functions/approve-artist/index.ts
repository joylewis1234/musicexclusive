import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { verifyAdmin } from "../_shared/verify-admin.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApproveArtistRequest {
  applicationId: string;
  baseUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { applicationId, baseUrl = "https://music-exclusive.lovable.app" }: ApproveArtistRequest = await req.json();

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

    // Update status to approved_pending_setup
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

    // Generate secure setup link
    const setupLink = `${baseUrl}/artist/setup-account?email=${encodeURIComponent(application.contact_email)}`;

    // Send approval email to artist
    let emailSent = false;
    let emailError: string | null = null;
    
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
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 25px; color: #e2e8f0; font-size: 16px; line-height: 1.7;">
                Congratulations! Your application to join <strong style="color: #a78bfa;">Music Exclusive</strong> has been approved.
              </p>
              <div style="text-align: center; margin: 35px 0;">
                <a href="${setupLink}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 12px; font-size: 16px; font-weight: 700; letter-spacing: 1px; box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);">
                  SET UP MY ARTIST ACCOUNT
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px 30px; background: rgba(0, 0, 0, 0.3); border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">MUSIC EXCLUSIVE</p>
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
        from: "Music Exclusive <onboarding@resend.dev>",
        to: [application.contact_email],
        subject: "Your Music Exclusive Artist Application Was Approved 🎉",
        html: approvalEmailHtml,
      });
      
      emailSent = true;
      console.log("Approval email sent to:", application.contact_email);
    } catch (err) {
      emailError = err instanceof Error ? err.message : "Email send failed";
      console.error("Failed to send approval email:", emailError);
    }
    
    console.log("Artist approved. Setup link:", setupLink);

    return new Response(
      JSON.stringify({
        success: true,
        applicationId,
        artistName: application.artist_name,
        email: application.contact_email,
        setupLink,
        emailSent,
        emailError,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in approve-artist function:", error);
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
