// Custom Supabase client pointing at external project
// All app code should import from this file instead of ./client
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/supabase';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Edge Functions are deployed on Lovable Cloud, not the external project.
// Override the functions URL so supabase.functions.invoke() routes correctly.
(supabase as any).functionsUrl = "https://yjytuglxpvdkyvjsdyfk.supabase.co/functions/v1";
