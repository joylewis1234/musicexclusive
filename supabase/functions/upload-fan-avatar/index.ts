import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract Bearer token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with anon key to validate the JWT
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("[upload-fan-avatar] Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log("[upload-fan-avatar] User authenticated:", userId);

    // Parse multipart form
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: `Invalid file type ${file.type}. Please upload JPG, PNG, or WEBP.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size (max 10 MB)
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return new Response(
        JSON.stringify({ error: "File too large. Max 10MB allowed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine extension
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const ext = extMap[file.type] || "jpg";

    // Deterministic path: fans/{userId}/profile.{ext}
    const objectPath = `fans/${userId}/profile.${ext}`;

    console.log("[upload-fan-avatar] Uploading to:", objectPath);

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    // Use service role client for storage (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from("avatars")
      .upload(objectPath, fileBuffer, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("[upload-fan-avatar] Upload error:", uploadError);
      return new Response(
        JSON.stringify({
          error: uploadError.message,
          name: (uploadError as any)?.name,
          status: (uploadError as any)?.status,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[upload-fan-avatar] Upload successful:", uploadData);

    // Get public URL (bucket is public)
    const { data: publicData } = serviceClient.storage.from("avatars").getPublicUrl(objectPath);
    const publicUrl = publicData?.publicUrl || "";

    if (!publicUrl) {
      return new Response(
        JSON.stringify({ error: "Failed to generate public URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[upload-fan-avatar] Public URL:", publicUrl);

    // Persist the URL to profiles table
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await serviceClient
      .from("profiles")
      .update({ avatar_url: publicUrl, updated_at: now })
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("[upload-fan-avatar] DB update error:", updateError);
      return new Response(
        JSON.stringify({
          error: updateError.message,
          name: (updateError as any)?.name,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no row was updated (profile doesn't exist yet), insert new profile
    if (!updated) {
      const { error: insertError } = await serviceClient
        .from("profiles")
        .insert({
          user_id: userId,
          display_name: "Fan",
          avatar_url: publicUrl,
          updated_at: now,
        });

      if (insertError) {
        console.error("[upload-fan-avatar] DB insert error:", insertError);
        return new Response(
          JSON.stringify({
            error: insertError.message,
            name: (insertError as any)?.name,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        path: objectPath,
        url: publicUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unexpected error";
    console.error("[upload-fan-avatar] Unexpected error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
