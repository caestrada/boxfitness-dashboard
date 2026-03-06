import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/env"
import { normalizeRedirectPath } from "@/lib/url"

function isProtectedRoute(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/")
}

function isAuthLanding(pathname: string) {
  return pathname === "/auth"
}

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie)
  }

  return to
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  if (!hasSupabaseEnv()) {
    return response
  }

  const { supabaseUrl, supabasePublishableKey } = getSupabaseEnv()

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        response = NextResponse.next({
          request,
        })

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtectedRoute(request.nextUrl.pathname)) {
    const authUrl = request.nextUrl.clone()
    authUrl.pathname = "/auth"
    authUrl.searchParams.set(
      "redirectTo",
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    )

    return copyCookies(response, NextResponse.redirect(authUrl))
  }

  if (user && isAuthLanding(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = normalizeRedirectPath(
      request.nextUrl.searchParams.get("redirectTo")
    )
    redirectUrl.search = ""

    return copyCookies(response, NextResponse.redirect(redirectUrl))
  }

  return response
}
