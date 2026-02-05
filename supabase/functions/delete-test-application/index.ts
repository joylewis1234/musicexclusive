import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for admin check and deletions
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { applicationId } = await req.json();
    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: "applicationId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch the application to get the contact_email
    const { data: application, error: appError } = await supabaseAdmin
      .from("artist_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      return new Response(
        JSON.stringify({ error: "Application not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contactEmail = application.contact_email?.toLowerCase().trim();
    const deletedItems: string[] = [];

    // 2. Delete email_logs for this application
    const { error: emailLogsError } = await supabaseAdmin
      .from("email_logs")
      .delete()
      .eq("application_id", applicationId);

    if (!emailLogsError) {
      deletedItems.push("email_logs");
    } else {
      console.warn("Failed to delete email_logs:", emailLogsError.message);
    }

    // 3. Delete application_action_tokens for this application
    const { error: tokensError } = await supabaseAdmin
      .from("application_action_tokens")
      .delete()
      .eq("application_id", applicationId);

    if (!tokensError) {
      deletedItems.push("action_tokens");
    } else {
      console.warn("Failed to delete action tokens:", tokensError.message);
    }

    // 4. If an artist account exists for this email, clean up
    if (contactEmail) {
      // Find auth user by email
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const matchedUser = authUsers?.users?.find(
        (u) => u.email?.toLowerCase().trim() === contactEmail
      );

      if (matchedUser) {
        const artistUserId = matchedUser.id;

        // Delete artist_profiles
        const { error: profileError } = await supabaseAdmin
          .from("artist_profiles")
          .delete()
          .eq("user_id", artistUserId);

        if (!profileError) {
          deletedItems.push("artist_profile");
        } else {
          console.warn("Failed to delete artist profile:", profileError.message);
        }

        // Delete artist_agreement_acceptances
        const { error: agreementError } = await supabaseAdmin
          .from("artist_agreement_acceptances")
          .delete()
          .eq("artist_id", artistUserId);

        if (!agreementError) {
          deletedItems.push("artist_agreements");
        } else {
          console.warn("Failed to delete artist agreements:", agreementError.message);
        }

        // Delete user_roles for this user
        const { error: rolesError } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", artistUserId);

        if (!rolesError) {
          deletedItems.push("user_roles");
        } else {
          console.warn("Failed to delete user roles:", rolesError.message);
        }

        // Delete the auth user itself so the email can be reused
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
          artistUserId
        );

        if (!authDeleteError) {
          deletedItems.push("auth_user");
        } else {
          console.warn("Failed to delete auth user:", authDeleteError.message);
        }
      }
    }

    // 5. Delete the application record itself
    const { error: deleteAppError } = await supabaseAdmin
      .from("artist_applications")
      .delete()
      .eq("id", applicationId);

    if (deleteAppError) {
      return new Response(
        JSON.stringify({ error: `Failed to delete application: ${deleteAppError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    deletedItems.push("application");

    // Log admin action
    await supabaseAdmin
      .from("admin_action_logs")
      .insert({
        admin_email: user.email,
        action_type: "delete_test_application",
        target_type: "artist_application",
        target_id: applicationId,
        details: {
          artist_name: application.artist_name,
          contact_email: contactEmail,
          deleted_items: deletedItems,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        deleted: deletedItems,
        artist_name: application.artist_name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete application error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
