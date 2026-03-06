"use client"

import { createBrowserClient } from "@supabase/ssr"

import { getSupabaseEnv } from "@/lib/env"

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  const { supabaseUrl, supabasePublishableKey } = getSupabaseEnv()

  browserClient ??= createBrowserClient(supabaseUrl, supabasePublishableKey)

  return browserClient
}
