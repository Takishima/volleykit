import { test, expect } from "./fixtures";
import { LoginPage, AssignmentsPage, NavigationPage } from "./pages";

/**
 * Assignments page E2E tests - focused on browser-specific behavior only.
 *
 * These tests verify:
 * - Page loading with real data fetching
 * - Cross-page navigation flows
 *
 * Tab navigation, ARIA attributes, card rendering, and accessibility
 * are covered by unit tests in src/pages/AssignmentsPage.test.tsx
 */
test.describe("Assignments Journey", () => {
  let loginPage: LoginPage;
  let assignmentsPage: AssignmentsPage;
  let navigation: NavigationPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    assignmentsPage = new AssignmentsPage(page);
    navigation = new NavigationPage(page);

    await loginPage.goto();
    await loginPage.enterDemoMode();
  });

  test.describe("Page Loading", () => {
    test("displays assignments page with tabs after navigation", async () => {
      await assignmentsPage.expectToBeLoaded();
      await expect(assignmentsPage.upcomingTab).toBeVisible();
      await expect(assignmentsPage.validationClosedTab).toBeVisible();
    });

    test("loads assignment cards from demo API", async () => {
      await assignmentsPage.waitForAssignmentsLoaded();
      const count = await assignmentsPage.getAssignmentCount();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe("Cross-Page Navigation", () => {
    test("can navigate to assignments from compensations page", async ({
      page,
    }) => {
      await navigation.goToCompensations();
      await expect(page).toHaveURL("/compensations");

      await navigation.goToAssignments();
      await expect(page).toHaveURL("/");
      await assignmentsPage.expectToBeLoaded();
    });
  });
});
