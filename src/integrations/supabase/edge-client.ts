/**
 * Supabase client configured for Edge Function invocations only.
 * Edge Functions are deployed on Lovable Cloud, not the external project.
 * Auth/DB calls should still use the main client from ./client.ts.
 */
import { createClient } from '@supabase/supabase-js';

const EDGE_FUNCTIONS_URL = "https://yjytuglxpvdkyvjsdyfk.supabase.co";
const EDGE_FUNCTIONS_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqeXR1Z2x4cHZka3l2anNkeWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMzM3MzMsImV4cCI6MjA4NDkwOTczM30.NEs_fcWRbHfrDIVIySQHRs8xq9mrel9ZxBGg4YA95a0";

export const supabaseEdge = createClient(EDGE_FUNCTIONS_URL, EDGE_FUNCTIONS_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
