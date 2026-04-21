"use server";

import { redirect } from "next/navigation";

import {
  type AuthActionState,
  initialAuthActionState,
} from "@/lib/auth/form-state";
import { emailAuthSchema } from "@/lib/auth/schemas";
import { hasSupabaseEnv, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getRequestOrigin, normalizeRedirectPath } from "@/lib/url";

function getAuthPayload(formData: FormData) {
  const payload = {
    email:
      typeof formData.get("email") === "string" ? formData.get("email") : "",
    password:
      typeof formData.get("password") === "string"
        ? formData.get("password")
        : "",
  };

  const parsed = emailAuthSchema.safeParse(payload);

  if (parsed.success) {
    return {
      success: true as const,
      data: parsed.data,
    };
  }

  const fieldErrors: AuthActionState["fieldErrors"] = {};

  for (const issue of parsed.error.issues) {
    const fieldName = issue.path[0];

    if (fieldName === "email" || fieldName === "password") {
      fieldErrors[fieldName] = issue.message;
    }
  }

  return {
    success: false as const,
    state: {
      ...initialAuthActionState,
      status: "error" as const,
      message: "Fix the highlighted fields and try again.",
      fieldErrors,
    },
  };
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message: MISSING_SUPABASE_ENV_MESSAGE,
    };
  }

  const parsedPayload = getAuthPayload(formData);

  if (!parsedPayload.success) {
    return parsedPayload.state;
  }

  const redirectTo = normalizeRedirectPath(formData.get("redirectTo"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsedPayload.data);

  if (error) {
    return {
      status: "error",
      message: error.message,
    };
  }

  redirect(redirectTo);
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message: MISSING_SUPABASE_ENV_MESSAGE,
    };
  }

  const parsedPayload = getAuthPayload(formData);

  if (!parsedPayload.success) {
    return parsedPayload.state;
  }

  const redirectTo = normalizeRedirectPath(formData.get("redirectTo"));
  const emailRedirectTo = new URL("/auth/callback", await getRequestOrigin());
  emailRedirectTo.searchParams.set("next", redirectTo);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsedPayload.data,
    options: {
      emailRedirectTo: emailRedirectTo.toString(),
    },
  });

  if (error) {
    return {
      status: "error",
      message: error.message,
    };
  }

  if (data.session) {
    redirect(redirectTo);
  }

  return {
    status: "success",
    message:
      "Check your inbox to confirm your email, then come back through the callback link.",
  };
}

export async function signOutAction() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/");
}
