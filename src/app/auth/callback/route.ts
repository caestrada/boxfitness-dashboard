import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

import { hasSupabaseEnv, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env"
import { createClient } from "@/lib/supabase/server"
import { normalizeRedirectPath } from "@/lib/url"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const next = normalizeRedirectPath(requestUrl.searchParams.get("next"))

  if (!hasSupabaseEnv()) {
    const authUrl = new URL("/auth", requestUrl.origin)
    authUrl.searchParams.set("message", MISSING_SUPABASE_ENV_MESSAGE)
    return NextResponse.redirect(authUrl)
  }

  const code = requestUrl.searchParams.get("code")
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null
  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      const authUrl = new URL("/auth", requestUrl.origin)
      authUrl.searchParams.set("message", error.message)
      return NextResponse.redirect(authUrl)
    }

    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })

    if (error) {
      const authUrl = new URL("/auth", requestUrl.origin)
      authUrl.searchParams.set("message", error.message)
      return NextResponse.redirect(authUrl)
    }

    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  return NextResponse.redirect(new URL("/auth", requestUrl.origin))
}
