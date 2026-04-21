import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SUPABASE_URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_PUBLISHABLE_KEY = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

const originalEnv = {
  url: process.env[SUPABASE_URL_KEY],
  key: process.env[SUPABASE_PUBLISHABLE_KEY],
};

async function loadEnvModule() {
  vi.resetModules();
  return import("@/lib/env");
}

beforeEach(() => {
  delete process.env[SUPABASE_URL_KEY];
  delete process.env[SUPABASE_PUBLISHABLE_KEY];
});

afterEach(() => {
  if (originalEnv.url === undefined) {
    delete process.env[SUPABASE_URL_KEY];
  } else {
    process.env[SUPABASE_URL_KEY] = originalEnv.url;
  }

  if (originalEnv.key === undefined) {
    delete process.env[SUPABASE_PUBLISHABLE_KEY];
  } else {
    process.env[SUPABASE_PUBLISHABLE_KEY] = originalEnv.key;
  }
});

describe("hasSupabaseEnv", () => {
  it("returns false when either env is missing", async () => {
    process.env[SUPABASE_URL_KEY] = "https://example.supabase.co";
    const { hasSupabaseEnv } = await loadEnvModule();
    expect(hasSupabaseEnv()).toBe(false);
  });

  it("returns true when both envs are set", async () => {
    process.env[SUPABASE_URL_KEY] = "https://example.supabase.co";
    process.env[SUPABASE_PUBLISHABLE_KEY] = "publishable-key";
    const { hasSupabaseEnv } = await loadEnvModule();
    expect(hasSupabaseEnv()).toBe(true);
  });
});

describe("getSupabaseEnv", () => {
  it("throws a descriptive error when env is missing", async () => {
    const { getSupabaseEnv, MISSING_SUPABASE_ENV_MESSAGE } =
      await loadEnvModule();
    expect(() => getSupabaseEnv()).toThrow(MISSING_SUPABASE_ENV_MESSAGE);
  });

  it("returns the trimmed env values when present", async () => {
    process.env[SUPABASE_URL_KEY] = "  https://example.supabase.co  ";
    process.env[SUPABASE_PUBLISHABLE_KEY] = "  publishable-key  ";
    const { getSupabaseEnv } = await loadEnvModule();
    expect(getSupabaseEnv()).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabasePublishableKey: "publishable-key",
    });
  });
});

describe("getSupabaseProjectHost", () => {
  it("returns null when the URL is missing", async () => {
    const { getSupabaseProjectHost } = await loadEnvModule();
    expect(getSupabaseProjectHost()).toBeNull();
  });

  it("returns null when the URL is not parseable", async () => {
    process.env[SUPABASE_URL_KEY] = "not a url";
    const { getSupabaseProjectHost } = await loadEnvModule();
    expect(getSupabaseProjectHost()).toBeNull();
  });

  it("returns the host for a valid URL", async () => {
    process.env[SUPABASE_URL_KEY] = "https://abc.supabase.co";
    const { getSupabaseProjectHost } = await loadEnvModule();
    expect(getSupabaseProjectHost()).toBe("abc.supabase.co");
  });
});
