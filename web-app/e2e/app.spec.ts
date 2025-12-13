import { test, expect } from "@playwright/test";

test.describe("VolleyKit App", () => {
  test.describe("Login Page", () => {
    test("displays login form", async ({ page }) => {
      await page.goto("/login");

      // Check page title
      await expect(page).toHaveTitle(/VolleyKit/);

      // Check login form elements are present
      await expect(page.getByLabel(/username/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /login|sign in/i }),
      ).toBeVisible();
    });

    test("shows demo mode option", async ({ page }) => {
      await page.goto("/login");

      // Check demo mode button is present
      await expect(page.getByRole("button", { name: /demo/i })).toBeVisible();
    });

    test("validates empty form submission", async ({ page }) => {
      await page.goto("/login");

      const usernameInput = page.getByLabel(/username/i);
      const loginButton = page.getByRole("button", { name: /login|sign in/i });

      // Verify the input has the required attribute for HTML5 validation
      const isRequired = await usernameInput.getAttribute("required");
      expect(isRequired).not.toBeNull();

      // Try to submit empty form
      await loginButton.click();

      // Check for HTML5 validation - the input should show validation error
      // This validates that required fields are enforced via HTML5 'required' attribute
      const validationMessage = await usernameInput.evaluate(
        (el: HTMLInputElement) => el.validationMessage,
      );

      // HTML5 required attribute should always produce a validation message
      // when trying to submit an empty form
      expect(validationMessage).toBeTruthy();
      expect(validationMessage).not.toBe("");
    });
  });

  test.describe("Demo Mode", () => {
    test("can enter demo mode", async ({ page }) => {
      await page.goto("/login");

      // Click demo mode button
      await page.getByRole("button", { name: /demo/i }).click();

      // Should navigate away from login page
      await expect(page).not.toHaveURL(/login/);
    });

    test("demo mode shows assignments page", async ({ page }) => {
      await page.goto("/login");

      // Enter demo mode
      await page.getByRole("button", { name: /demo/i }).click();

      // Should show some content (assignments, dashboard, etc.)
      // Wait for navigation to complete
      await page.waitForURL(/\/(assignments|dashboard)?$/);

      // Page should have main content
      await expect(page.getByRole("main")).toBeVisible();
    });
  });

  test.describe("Navigation", () => {
    test("unauthenticated user is redirected to login", async ({ page }) => {
      // Try to access protected route
      await page.goto("/assignments");

      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe("Accessibility", () => {
    test("login page has proper heading structure", async ({ page }) => {
      await page.goto("/login");

      // Should have at least one heading
      const headings = page.getByRole("heading");
      await expect(headings.first()).toBeVisible();
    });

    test("login form inputs have labels", async ({ page }) => {
      await page.goto("/login");

      // Inputs should be accessible via labels
      const usernameInput = page.getByLabel(/username/i);
      const passwordInput = page.getByLabel(/password/i);

      await expect(usernameInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
    });
  });

  test.describe("Responsive Design", () => {
    test("login page renders on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/login");

      // Form should still be visible
      await expect(
        page.getByRole("button", { name: /login|sign in/i }),
      ).toBeVisible();
    });
  });
});
