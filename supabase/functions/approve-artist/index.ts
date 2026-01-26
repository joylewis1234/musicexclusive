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

    // Email sending is paused - using on-screen approval confirmation instead
    // TODO: Re-enable Resend email sending when domain verification is complete
    const emailSent = false;
    const emailError = "Email sending paused - using on-screen confirmation";
    
    console.log("Artist approved. Email sending paused. Setup link:", setupLink);

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
