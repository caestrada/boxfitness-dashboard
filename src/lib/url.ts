import { headers } from "next/headers";

const DEFAULT_REDIRECT_PATH = "/dashboard";
const DEFAULT_LOCAL_ORIGIN = "http://localhost:3000";

export function getFirstString(
  value: FormDataEntryValue | string | string[] | null | undefined,
) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : null;
  }

  return null;
}

export function normalizeRedirectPath(
  value: FormDataEntryValue | string | string[] | null | undefined,
) {
  const candidate = getFirstString(value);

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return DEFAULT_REDIRECT_PATH;
  }

  return candidate;
}

export async function getRequestOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  if (host) {
    return `${protocol}://${host}`;
  }

  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? DEFAULT_LOCAL_ORIGIN
  );
}
