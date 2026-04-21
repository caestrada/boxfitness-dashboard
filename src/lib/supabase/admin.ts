import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/env";

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export const MISSING_SUPABASE_SERVICE_ROLE_KEY_MESSAGE =
  "Add SUPABASE_SERVICE_ROLE_KEY to enable server-side subscription sync.";

export function hasSupabaseAdminEnv() {
  return Boolean(supabaseServiceRoleKey);
}

export function createAdminClient() {
  const { supabaseUrl } = getSupabaseEnv();

  if (!supabaseServiceRoleKey) {
    throw new Error(MISSING_SUPABASE_SERVICE_ROLE_KEY_MESSAGE);
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
