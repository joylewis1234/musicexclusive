import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

    // Try to send email
    let emailSent = false;
    let emailError = null;

    try {
      const emailResponse = await resend.emails.send({
        from: "Music Exclusive <noreply@resend.dev>",
        to: [application.contact_email],
        subject: "🎉 You're Approved — Welcome to Music Exclusive",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="font-size: 28px; margin: 0; color: #ffffff;">Music Exclusive</h1>
              </div>
              
              <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 16px; padding: 40px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
                
                <h2 style="font-size: 24px; margin: 0 0 16px 0; color: #ffffff;">
                  Congratulations, ${application.artist_name}!
                </h2>
                
                <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0; margin: 0 0 24px 0;">
                  You've been approved as an Exclusive Artist on Music Exclusive.
                </p>
                
                <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0; margin: 0 0 32px 0;">
                  Click below to set up your artist account and start uploading your exclusive releases.
                </p>
                
                <a href="${setupLink}" style="display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">
                  SET UP MY ARTIST ACCOUNT
                </a>
                
                <p style="font-size: 12px; color: #666666; margin-top: 32px;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${setupLink}" style="color: #a855f7; word-break: break-all;">${setupLink}</a>
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 40px;">
                <p style="font-size: 12px; color: #666666;">
                  © ${new Date().getFullYear()} Music Exclusive. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      console.log("Approval email sent successfully:", emailResponse);
      emailSent = true;
    } catch (err) {
      console.error("Failed to send email:", err);
      emailError = err instanceof Error ? err.message : "Unknown email error";
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
