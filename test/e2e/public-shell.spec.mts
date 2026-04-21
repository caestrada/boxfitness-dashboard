import { expect, test } from "@playwright/test";

test.describe("public shell", () => {
  test("redirects unauthenticated dashboard visits to /auth with redirectTo preserved", async ({
    page,
  }) => {
    await page.goto("/dashboard/members");

    await expect(page).toHaveURL(/\/auth\?redirectTo=%2Fdashboard%2Fmembers/);
  });

  test("renders the sign-in form with email and password fields", async ({
    page,
  }) => {
    await page.goto("/auth");

    const signInForm = page
      .locator("form")
      .filter({ has: page.getByRole("button", { name: "Sign in" }) });

    await expect(signInForm).toBeVisible();
    await expect(signInForm.getByLabel("Email")).toBeVisible();
    await expect(signInForm.getByLabel("Password")).toBeVisible();
    await expect(
      signInForm.getByRole("button", { name: "Sign in" }),
    ).toBeVisible();
  });
});
