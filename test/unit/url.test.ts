import { describe, expect, it } from "vitest";

import { getFirstString, normalizeRedirectPath } from "@/lib/url";

describe("getFirstString", () => {
  it("returns the string directly", () => {
    expect(getFirstString("hello")).toBe("hello");
  });

  it("returns the first string from an array", () => {
    expect(getFirstString(["a", "b"])).toBe("a");
  });

  it("returns null for arrays whose first value is not a string", () => {
    // @ts-expect-error — exercising the runtime guard
    expect(getFirstString([null])).toBeNull();
  });

  it("returns null for null / undefined", () => {
    expect(getFirstString(null)).toBeNull();
    expect(getFirstString(undefined)).toBeNull();
  });
});

describe("normalizeRedirectPath", () => {
  it("defaults to /dashboard when the value is missing or invalid", () => {
    expect(normalizeRedirectPath(null)).toBe("/dashboard");
    expect(normalizeRedirectPath(undefined)).toBe("/dashboard");
    expect(normalizeRedirectPath("")).toBe("/dashboard");
  });

  it("rejects protocol-relative and absolute URLs to prevent open redirects", () => {
    expect(normalizeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(normalizeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(normalizeRedirectPath("evil.com")).toBe("/dashboard");
  });

  it("accepts relative paths that start with a single slash", () => {
    expect(normalizeRedirectPath("/dashboard/members")).toBe(
      "/dashboard/members",
    );
    expect(normalizeRedirectPath(["/dashboard/profile"])).toBe(
      "/dashboard/profile",
    );
  });
});
