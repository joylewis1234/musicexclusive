import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { verifyAdmin } from "../_shared/verify-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const KEEP_EMAILS = [
  "test-artist+validation@example.com",
  "joylewismusic+testdemo1@gmail.com",
  "demo-fan@test.com",
  "support@musicexclusive.co",
];

const KEEP_USER_IDS = [
  "b429eeb1-d3b8-4e76-a555-f7d3e0e9e5a0",
  "ba5df0b2-4a59-4f98-9e17-6c7e3e6cb692",
  "db9c713b-5849-4ba4-8e8a-28b3e4f5c1d2",
  "558ee15a-4c28-4e6f-b8a3-7d9f2e1c3b4a",
];

const KEEP_ARTIST_IDS = [
  "b5ce51ad-3b7a-4c8e-9f1d-2e6a7b8c9d0e",
  "435b37fd-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, error: authError } = await verifyAdmin(
      req.headers.get("Authorization")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: authError }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const summary: Record<string, number> = {};
    const log = (table: string, count: number) => {
      summary[table] = (summary[table] || 0) + count;
    };

    // ── Resolve actual keep user IDs from auth ──
    const keepUserIds: string[] = [];
    for (const email of KEEP_EMAILS) {
      const { data } = await sb.auth.admin.listUsers({ perPage: 100 });
      const found = data?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (found) keepUserIds.push(found.id);
    }
    console.log(`[CLEANUP] Resolved ${keepUserIds.length} keep user IDs:`, keepUserIds);

    // ── Resolve actual keep artist profile IDs ──
    const { data: keptProfiles } = await sb
      .from("artist_profiles")
      .select("id")
      .in("user_id", keepUserIds);
    const keepArtistIds = (keptProfiles || []).map((p) => p.id);
    console.log(`[CLEANUP] Keep artist profile IDs:`, keepArtistIds);

    // ── 1. Find tracks to delete ──
    const { data: allTracks } = await sb.from("tracks").select("id, artist_id");
    const tracksToDelete = (allTracks || []).filter(
      (t) => !keepArtistIds.includes(t.artist_id) && !keepArtistIds.map(String).includes(String(t.artist_id))
    );
    const deleteTrackIds = tracksToDelete.map((t) => t.id);
    console.log(`[CLEANUP] Tracks to delete: ${deleteTrackIds.length}`);

    if (deleteTrackIds.length > 0) {
      // Delete track dependencies in batches of 50
      for (let i = 0; i < deleteTrackIds.length; i += 50) {
        const batch = deleteTrackIds.slice(i, i + 50);

        if (!dryRun) {
          const tables = [
            "fan_playlists",
            "track_likes",
            "stream_charges",
            "stream_ledger",
            "playback_sessions",
          ];
          for (const table of tables) {
            const { count } = await sb
              .from(table)
              .delete({ count: "exact" })
              .in("track_id", batch);
            log(table, count || 0);
          }

          // shared_tracks uses text track_id
          const batchStr = batch.map(String);
          const { count: sharedCount } = await sb
            .from("shared_tracks")
            .delete({ count: "exact" })
            .in("track_id", batchStr);
          log("shared_tracks", sharedCount || 0);
        } else {
          for (const table of ["fan_playlists", "track_likes", "stream_charges", "stream_ledger", "playback_sessions"]) {
            const { count } = await sb
              .from(table)
              .select("*", { count: "exact", head: true })
              .in("track_id", batch);
            log(table, count || 0);
          }
          const { count: sharedCount } = await sb
            .from("shared_tracks")
            .select("*", { count: "exact", head: true })
            .in("track_id", batch.map(String));
          log("shared_tracks", sharedCount || 0);
        }
      }

      // marketing_assets — delete by artist_id not in keep list
      if (!dryRun) {
        const { data: maToDelete } = await sb
          .from("marketing_assets")
          .select("id, artist_id")
          .not("artist_id", "in", `(${keepArtistIds.join(",")})`);
        if (maToDelete && maToDelete.length > 0) {
          const { count } = await sb
            .from("marketing_assets")
            .delete({ count: "exact" })
            .in("id", maToDelete.map((m) => m.id));
          log("marketing_assets", count || 0);
        }
      } else {
        const { count } = await sb
          .from("marketing_assets")
          .select("*", { count: "exact", head: true })
          .not("artist_id", "in", `(${keepArtistIds.join(",")})`);
        log("marketing_assets", count || 0);
      }

      // Delete tracks
      for (let i = 0; i < deleteTrackIds.length; i += 50) {
        const batch = deleteTrackIds.slice(i, i + 50);
        if (!dryRun) {
          const { count } = await sb
            .from("tracks")
            .delete({ count: "exact" })
            .in("id", batch);
          log("tracks", count || 0);
        } else {
          log("tracks", batch.length);
        }
      }
    }

    // ── 2. Delete credit_ledger for non-kept emails ──
    const keepEmailsLower = KEEP_EMAILS.map((e) => e.toLowerCase());
    // Also keep platform email
    keepEmailsLower.push("platform@musicexclusive.com");

    const { data: allLedger } = await sb.from("credit_ledger").select("id, user_email");
    const ledgerToDelete = (allLedger || []).filter(
      (l) => !keepEmailsLower.includes(l.user_email.toLowerCase())
    );
    if (ledgerToDelete.length > 0) {
      for (let i = 0; i < ledgerToDelete.length; i += 50) {
        const batch = ledgerToDelete.slice(i, i + 50).map((l) => l.id);
        if (!dryRun) {
          const { count } = await sb.from("credit_ledger").delete({ count: "exact" }).in("id", batch);
          log("credit_ledger", count || 0);
        } else {
          log("credit_ledger", batch.length);
        }
      }
    }

    // ── 3. Delete vault_members for non-kept emails ──
    const { data: allVault } = await sb.from("vault_members").select("id, email");
    const vaultToDelete = (allVault || []).filter(
      (v) => !keepEmailsLower.includes(v.email.toLowerCase())
    );
    if (vaultToDelete.length > 0) {
      for (let i = 0; i < vaultToDelete.length; i += 50) {
        const batch = vaultToDelete.slice(i, i + 50).map((v) => v.id);
        if (!dryRun) {
          // Delete shared_artist_profiles referencing these vault member IDs
          const { count: sapCount } = await sb
            .from("shared_artist_profiles")
            .delete({ count: "exact" })
            .or(`sender_id.in.(${batch.join(",")}),recipient_id.in.(${batch.join(",")})`);
          log("shared_artist_profiles", sapCount || 0);

          const { count } = await sb.from("vault_members").delete({ count: "exact" }).in("id", batch);
          log("vault_members", count || 0);
        } else {
          log("vault_members", batch.length);
        }
      }
    }

    // ── 4. Delete artist-specific tables for non-kept users ──
    // artist_agreement_acceptances
    const { data: allAaa } = await sb.from("artist_agreement_acceptances").select("id, artist_id");
    const aaaToDelete = (allAaa || []).filter(
      (a) => !keepUserIds.includes(a.artist_id) && !keepArtistIds.includes(a.artist_id)
    );
    if (aaaToDelete.length > 0 && !dryRun) {
      const { count } = await sb.from("artist_agreement_acceptances").delete({ count: "exact" }).in("id", aaaToDelete.map((a) => a.id));
      log("artist_agreement_acceptances", count || 0);
    } else {
      log("artist_agreement_acceptances", aaaToDelete.length);
    }

    // artist_profiles (non-kept)
    const { data: allAp } = await sb.from("artist_profiles").select("id, user_id");
    const apToDelete = (allAp || []).filter(
      (a) => !keepUserIds.includes(a.user_id)
    );
    if (apToDelete.length > 0 && !dryRun) {
      const { count } = await sb.from("artist_profiles").delete({ count: "exact" }).in("id", apToDelete.map((a) => a.id));
      log("artist_profiles", count || 0);
    } else {
      log("artist_profiles", apToDelete.length);
    }

    // artist_applications (non-kept contact_email)
    const { data: allApps } = await sb.from("artist_applications").select("id, contact_email");
    const appsToDelete = (allApps || []).filter(
      (a) => !keepEmailsLower.includes(a.contact_email.toLowerCase())
    );
    if (appsToDelete.length > 0) {
      const appIds = appsToDelete.map((a) => a.id);
      // Delete dependent tokens and email_logs first
      if (!dryRun) {
        const { count: tokenCount } = await sb.from("application_action_tokens").delete({ count: "exact" }).in("application_id", appIds);
        log("application_action_tokens", tokenCount || 0);
        const { count: emailCount } = await sb.from("email_logs").delete({ count: "exact" }).in("application_id", appIds);
        log("email_logs", emailCount || 0);
        const { count } = await sb.from("artist_applications").delete({ count: "exact" }).in("id", appIds);
        log("artist_applications", count || 0);
      } else {
        const { count: tc } = await sb.from("application_action_tokens").select("*", { count: "exact", head: true }).in("application_id", appIds);
        log("application_action_tokens", tc || 0);
        const { count: ec } = await sb.from("email_logs").select("*", { count: "exact", head: true }).in("application_id", appIds);
        log("email_logs", ec || 0);
        log("artist_applications", appIds.length);
      }
    }

    // ── 5. Delete general user tables ──
    for (const table of ["user_roles", "profiles", "fan_terms_acceptances", "app_error_logs"]) {
      const col = "user_id";
      const { data: rows } = await sb.from(table).select(`id, ${col}`);
      const toDelete = (rows || []).filter((r) => !keepUserIds.includes(r[col]));
      if (toDelete.length > 0) {
        if (!dryRun) {
          const { count } = await sb.from(table).delete({ count: "exact" }).in("id", toDelete.map((r) => r.id));
          log(table, count || 0);
        } else {
          log(table, toDelete.length);
        }
      }
    }

    // agreement_acceptances by email
    const { data: allAa } = await sb.from("agreement_acceptances").select("id, email");
    const aaToDelete = (allAa || []).filter(
      (a) => !keepEmailsLower.includes(a.email.toLowerCase())
    );
    if (aaToDelete.length > 0 && !dryRun) {
      const { count } = await sb.from("agreement_acceptances").delete({ count: "exact" }).in("id", aaToDelete.map((a) => a.id));
      log("agreement_acceptances", count || 0);
    } else {
      log("agreement_acceptances", aaToDelete.length);
    }

    // ── 6. vault_codes for non-kept emails ──
    const { data: allVc } = await sb.from("vault_codes").select("id, email");
    const vcToDelete = (allVc || []).filter(
      (v) => !keepEmailsLower.includes(v.email.toLowerCase())
    );
    if (vcToDelete.length > 0 && !dryRun) {
      const { count } = await sb.from("vault_codes").delete({ count: "exact" }).in("id", vcToDelete.map((v) => v.id));
      log("vault_codes", count || 0);
    } else {
      log("vault_codes", vcToDelete.length);
    }

    // ── 7. Delete auth users ──
    let authDeleted = 0;
    // Paginate through all auth users
    let page = 1;
    const allAuthUsers: { id: string; email?: string }[] = [];
    while (true) {
      const { data } = await sb.auth.admin.listUsers({ page, perPage: 100 });
      if (!data?.users || data.users.length === 0) break;
      allAuthUsers.push(...data.users.map((u) => ({ id: u.id, email: u.email })));
      if (data.users.length < 100) break;
      page++;
    }

    const usersToDelete = allAuthUsers.filter(
      (u) => !keepUserIds.includes(u.id)
    );
    console.log(`[CLEANUP] Auth users to delete: ${usersToDelete.length}`);

    for (const u of usersToDelete) {
      if (!dryRun) {
        const { error } = await sb.auth.admin.deleteUser(u.id);
        if (error) {
          console.error(`[CLEANUP] Failed to delete auth user ${u.email}: ${error.message}`);
        } else {
          authDeleted++;
        }
      } else {
        authDeleted++;
      }
    }
    log("auth_users", authDeleted);

    // ── Clean up ancillary tables ──
    // monitoring_events, stripe_events, request_rate_limits — clear all
    if (!dryRun) {
      for (const table of ["monitoring_events", "request_rate_limits"]) {
        const { count } = await sb.from(table).delete({ count: "exact" }).gte("id", "0");
        log(table, count || 0);
      }
    }

    return new Response(
      JSON.stringify({ dryRun, summary, keepUserIds, keepArtistIds }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[CLEANUP] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
