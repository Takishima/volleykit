import { test, expect } from "@playwright/test";
import { LoginPage, NavigationPage, AssignmentsPage } from "./pages";

/**
 * Calendar Mode E2E tests - focused on browser-specific behavior.
 *
 * These tests verify:
 * - Calendar mode login tab rendering and switching
 * - Calendar mode login flow with mocked API
 * - Navigation restrictions in calendar mode (hidden nav items)
 * - Calendar mode banner display
 *
 * Component rendering details and accessibility attributes are covered
 * by unit tests in src/pages/LoginPage.test.tsx and
 * src/components/layout/AppShell.test.tsx
 */

/**
 * Sample iCal content for mocking the calendar API response.
 * Contains a single upcoming assignment for testing.
 */
const MOCK_ICAL_CONTENT = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SwissVolley//VolleyManager//EN
X-WR-CALNAME:Referee Calendar
BEGIN:VEVENT
UID:referee-convocation-for-game-12345@volleymanager.volleyball.ch
DTSTART:20251220T180000Z
DTEND:20251220T200000Z
SUMMARY:ARB 1 | VBC Zürich - VBC Basel (NLA Men)
LOCATION:Saalsporthalle, Hardturmstrasse 150, 8005 Zürich
GEO:47.3928;8.5035
END:VEVENT
END:VCALENDAR`;

test.describe("Calendar Mode", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    // Wait for full hydration
    await page.waitForLoadState("networkidle");
  });

  test.describe("Login Page Tab Rendering", () => {
    test("displays both login mode tabs", async () => {
      await loginPage.expectCalendarModeTabVisible();
    });

    test("defaults to full login tab", async () => {
      // Username input should be visible by default (full login mode)
      await expect(loginPage.usernameInput).toBeVisible();
      await expect(loginPage.calendarInput).not.toBeVisible();
    });

    test("can switch to calendar mode tab", async () => {
      await loginPage.switchToCalendarMode();

      // Calendar input should now be visible
      await expect(loginPage.calendarInput).toBeVisible();
      await expect(loginPage.calendarLoginButton).toBeVisible();

      // Username/password should be hidden
      await expect(loginPage.usernameInput).not.toBeVisible();
      await expect(loginPage.passwordInput).not.toBeVisible();
    });

    test("can switch back to full login tab", async () => {
      await loginPage.switchToCalendarMode();
      await loginPage.switchToFullLogin();

      // Username/password should be visible again
      await expect(loginPage.usernameInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();

      // Calendar input should be hidden
      await expect(loginPage.calendarInput).not.toBeVisible();
    });

    test("demo button is visible in calendar mode tab", async () => {
      await loginPage.switchToCalendarMode();

      // Demo button should still be accessible
      await expect(loginPage.demoButton).toBeVisible();
    });
  });

  test.describe("Calendar Mode Login Flow", () => {
    test.beforeEach(async ({ page }) => {
      // Mock the calendar API endpoint to return valid iCal data
      await page.route("**/sportmanager.volleyball/calendar/ical/*", (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/calendar",
          body: MOCK_ICAL_CONTENT,
        }),
      );
    });

    test("can enter calendar mode with valid code", async ({ page }) => {
      await loginPage.enterCalendarMode("ABC123");

      // Should be on assignments page
      await expect(page).toHaveURL("/");

      // Should see calendar mode banner
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByText(/calendar mode/i)).toBeVisible();
    });

    test("shows assignment from calendar data", async ({ page }) => {
      const assignmentsPage = new AssignmentsPage(page);
      await loginPage.enterCalendarMode("ABC123");

      // Wait for assignments to load
      await assignmentsPage.waitForAssignmentsLoaded();

      // Should show team names from the mocked iCal
      await expect(page.getByText(/VBC Zürich/)).toBeVisible();
      await expect(page.getByText(/VBC Basel/)).toBeVisible();
    });

    test("displays calendar mode indicator banner", async ({ page }) => {
      await loginPage.enterCalendarMode("ABC123");

      // Banner should indicate read-only calendar mode
      const banner = page.getByRole("alert");
      await expect(banner).toBeVisible();
      await expect(banner).toContainText(/calendar/i);
    });
  });

  test.describe("Calendar Mode Navigation Restrictions", () => {
    test.beforeEach(async ({ page }) => {
      // Mock the calendar API
      await page.route("**/sportmanager.volleyball/calendar/ical/*", (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/calendar",
          body: MOCK_ICAL_CONTENT,
        }),
      );

      await loginPage.enterCalendarMode("ABC123");
    });

    test("hides Compensations nav item in calendar mode", async ({ page }) => {
      // Compensations link should not be visible
      await expect(
        page.getByRole("link", { name: /compensation/i }),
      ).not.toBeVisible();
    });

    test("hides Exchange nav item in calendar mode", async ({ page }) => {
      // Exchange link should not be visible
      await expect(
        page.getByRole("link", { name: /exchange/i }),
      ).not.toBeVisible();
    });

    test("shows Assignments nav item in calendar mode", async ({ page }) => {
      const navigation = new NavigationPage(page);
      // Assignments link should be visible
      await expect(navigation.assignmentsLink).toBeVisible();
    });

    test("shows Settings nav item in calendar mode", async ({ page }) => {
      const navigation = new NavigationPage(page);
      // Settings link should be visible
      await expect(navigation.settingsLink).toBeVisible();
    });

    test("cannot access compensations page via direct URL", async ({
      page,
    }) => {
      // Try to navigate directly to compensations
      await page.goto("/compensations");

      // Should redirect back (exact behavior depends on implementation)
      // Either stays on assignments or shows not found
      await expect(page).not.toHaveURL("/compensations");
    });

    test("cannot access exchange page via direct URL", async ({ page }) => {
      // Try to navigate directly to exchange
      await page.goto("/exchange");

      // Should redirect back
      await expect(page).not.toHaveURL("/exchange");
    });
  });

  test.describe("Calendar Mode Logout", () => {
    test.beforeEach(async ({ page }) => {
      // Mock the calendar API
      await page.route("**/sportmanager.volleyball/calendar/ical/*", (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/calendar",
          body: MOCK_ICAL_CONTENT,
        }),
      );

      await loginPage.enterCalendarMode("ABC123");
    });

    test("can logout from calendar mode", async ({ page }) => {
      const navigation = new NavigationPage(page);

      // Click logout
      await navigation.logout();

      // Should be redirected to login page
      await expect(page).toHaveURL(/login/);
      await loginPage.expectToBeVisible();
    });

    test("calendar mode banner disappears after logout", async ({ page }) => {
      const navigation = new NavigationPage(page);

      // Verify banner is visible first
      await expect(page.getByRole("alert")).toBeVisible();

      // Logout
      await navigation.logout();

      // On login page, no calendar banner
      await expect(page.getByRole("alert")).not.toBeVisible();
    });
  });

  test.describe("Calendar Mode Error Handling", () => {
    test("shows error for invalid calendar code format", async ({ page }) => {
      await loginPage.switchToCalendarMode();
      await loginPage.calendarInput.fill("bad");
      await loginPage.calendarLoginButton.click();

      // Should show error message (stays on login page)
      await expect(page).toHaveURL(/login/);
      // Error should be displayed
      await expect(page.getByText(/invalid/i)).toBeVisible();
    });

    test("shows error when calendar is not found", async ({ page }) => {
      // Mock 404 response for calendar API
      await page.route("**/sportmanager.volleyball/calendar/ical/*", (route) =>
        route.fulfill({
          status: 404,
          body: "Not Found",
        }),
      );

      await loginPage.switchToCalendarMode();
      await loginPage.calendarInput.fill("NOTFND");
      await loginPage.calendarLoginButton.click();

      // Should show not found error
      await expect(page).toHaveURL(/login/);
      await expect(
        page.getByText(/not found|calendar.*not.*found/i),
      ).toBeVisible();
    });
  });

  test.describe("Calendar Mode Responsive", () => {
    test("calendar mode tab works on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await loginPage.switchToCalendarMode();
      await expect(loginPage.calendarInput).toBeVisible();
      await expect(loginPage.calendarLoginButton).toBeVisible();
    });
  });
});
