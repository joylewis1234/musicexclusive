import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-ARTIST-INVITE] ${step}${detailsStr}`);
};

interface InviteRequest {
  artistName: string;
  artistEmail: string;
  htmlBody: string;
  textBody: string;
  isTest?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    logStep("ERROR: RESEND_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const resend = new Resend(resendApiKey);

  try {
    const body: InviteRequest = await req.json();
    const { artistName, artistEmail, htmlBody, textBody, isTest } = body;

    // Validate inputs
    if (!artistEmail || !artistEmail.includes("@")) {
      throw new Error("Valid artist email is required");
    }
    if (!htmlBody || typeof htmlBody !== "string") {
      throw new Error("HTML body is required");
    }
    if (!textBody || typeof textBody !== "string") {
      throw new Error("Text body is required");
    }

    logStep("Sending invite email", { 
      to: artistEmail, 
      artistName,
      isTest,
      htmlLength: htmlBody.length,
      textLength: textBody.length
    });

    // Determine recipient
    const recipientEmail = isTest ? "support@musicexclusive.co" : artistEmail;
    const subjectPrefix = isTest ? "[TEST] " : "";

    // Send the email with proper HTML and text bodies
    const emailResult = await resend.emails.send({
      from: "Music Exclusive <noreply@musicexclusive.co>",
      reply_to: "support@musicexclusive.co",
      to: [recipientEmail],
      subject: `${subjectPrefix}[Private Invitation] You've been spotted as a top tier artist. You're invited.`,
      html: htmlBody,
      text: textBody,
    });

    if (emailResult.error) {
      logStep("Email send failed", { error: emailResult.error.message });
      throw new Error(emailResult.error.message);
    }

    logStep("Email sent successfully", { emailId: emailResult.data?.id });

    // Log the sent invitation (only for non-test emails)
    if (!isTest) {
      // Get admin user from auth header
      const authHeader = req.headers.get("Authorization");
      let adminUserId: string | null = null;
      
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData } = await supabaseAdmin.auth.getUser(token);
        adminUserId = userData?.user?.id ?? null;
      }

      if (adminUserId) {
        await supabaseAdmin
          .from("invitation_email_logs")
          .insert({
            admin_user_id: adminUserId,
            invite_type: "email",
            artist_name: artistName || "Unknown",
            artist_email: artistEmail,
            status: "sent",
            sent_at: new Date().toISOString(),
          });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResult.data?.id,
        sentTo: recipientEmail,
        isTest
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logStep("ERROR", { message: error.message });

    // Try to log the failure
    try {
      const body = await req.clone().json().catch(() => ({}));
      const authHeader = req.headers.get("Authorization");
      
      if (authHeader && body.artistEmail) {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData } = await supabaseAdmin.auth.getUser(token);
        const adminUserId = userData?.user?.id;
        
        if (adminUserId) {
          await supabaseAdmin
            .from("invitation_email_logs")
            .insert({
              admin_user_id: adminUserId,
              invite_type: "email",
              artist_name: body.artistName || "Unknown",
              artist_email: body.artistEmail,
              status: "failed",
              error_message: error.message,
            });
        }
      }
    } catch {
      // Ignore logging errors
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
