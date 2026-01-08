import { test, expect } from "./fixtures";

/**
 * Core app E2E tests - focused on browser-specific behavior only.
 *
 * These tests verify:
 * - Navigation flows that require real routing
 * - Authentication/authorization redirects
 * - Responsive behavior requiring real viewport changes
 *
 * Component rendering, form validation, and accessibility attributes
 * are covered by unit tests in src/pages/LoginPage.test.tsx
 */
test.describe("VolleyKit App", () => {
  test.describe("Demo Mode Navigation", () => {
    test("can enter demo mode and navigate to assignments", async ({
      page,
    }) => {
      await page.goto("/login");

      // Wait for network idle to ensure React app is fully hydrated
      // This fixes flaky tests in Firefox where clicks during hydration may not register
      await page.waitForLoadState("networkidle");

      // Click demo mode button using stable test ID (locale-independent)
      await page.getByTestId("demo-button").click();

      // Should navigate away from login page to assignments
      await expect(page).not.toHaveURL(/login/);

      // Page should have main content
      await expect(page.getByRole("main")).toBeVisible();
    });
  });

  test.describe("Route Protection", () => {
    test("unauthenticated user is redirected to login", async ({ page }) => {
      // Try to access protected route
      await page.goto("/assignments");

      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe("Responsive Design", () => {
    test("login page renders on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/login");

      // Calendar mode is the default - check calendar login button is visible
      await expect(page.getByTestId("calendar-login-button")).toBeVisible();
      // Demo button should also be visible
      await expect(page.getByTestId("demo-button")).toBeVisible();
    });
  });
});
