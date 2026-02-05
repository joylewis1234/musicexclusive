 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 Deno.serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     // Get auth token from header
     const authHeader = req.headers.get("Authorization");
     if (!authHeader?.startsWith("Bearer ")) {
       return new Response(
         JSON.stringify({ success: false, message: "Missing authorization" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const token = authHeader.replace("Bearer ", "");
 
     // Create client to verify user
     const supabaseAuth = createClient(
       Deno.env.get("SUPABASE_URL")!,
       Deno.env.get("SUPABASE_ANON_KEY")!
     );
 
     const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
     if (userError || !userData?.user) {
       console.error("[finalize-artist-setup] auth error:", userError);
       return new Response(
         JSON.stringify({ success: false, message: "Invalid session" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const user = userData.user;
     const email = user.email?.toLowerCase();
 
     if (!email) {
       return new Response(
         JSON.stringify({ success: false, message: "No email on account" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Service role to bypass RLS
     const supabaseAdmin = createClient(
       Deno.env.get("SUPABASE_URL")!,
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
     );
 
     // Update application status to active (for all matching emails)
     const { error: updateError } = await supabaseAdmin
       .from("artist_applications")
       .update({ status: "active" })
       .ilike("contact_email", email);
 
     if (updateError) {
       console.error("[finalize-artist-setup] update error:", updateError);
       // Continue - this is non-blocking for the login flow
     }
 
     // Ensure artist role exists
     const { error: roleError } = await supabaseAdmin
       .from("user_roles")
       .upsert(
         { user_id: user.id, role: "artist" },
         { onConflict: "user_id,role" }
       );
 
     if (roleError) {
       console.error("[finalize-artist-setup] role error:", roleError);
       // Continue - role might already exist
     }
 
     // Check if artist profile exists; if not, create one
     const { data: existingProfile } = await supabaseAdmin
       .from("artist_profiles")
       .select("id")
       .eq("user_id", user.id)
       .maybeSingle();
 
     if (!existingProfile) {
       // Get artist name from application
       const { data: appData } = await supabaseAdmin
         .from("artist_applications")
         .select("artist_name, genres")
         .ilike("contact_email", email)
         .order("created_at", { ascending: false })
         .limit(1);
 
       const artistName = appData?.[0]?.artist_name || email.split("@")[0];
       const genre = appData?.[0]?.genres?.split(",")[0]?.trim() || null;
 
       const { error: profileError } = await supabaseAdmin
         .from("artist_profiles")
         .insert({
           user_id: user.id,
           artist_name: artistName,
           genre: genre,
         });
 
       if (profileError) {
         console.error("[finalize-artist-setup] profile creation error:", profileError);
       }
     }
 
     return new Response(
       JSON.stringify({ success: true, message: "Artist setup finalized" }),
       { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (err) {
     console.error("[finalize-artist-setup] unexpected error:", err);
     return new Response(
       JSON.stringify({ success: false, message: "Internal error" }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });