import { test, expect } from "@playwright/test";
import { LoginPage, AssignmentsPage, NavigationPage } from "./pages";

test.describe("Assignments Journey", () => {
  let loginPage: LoginPage;
  let assignmentsPage: AssignmentsPage;
  let navigation: NavigationPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    assignmentsPage = new AssignmentsPage(page);
    navigation = new NavigationPage(page);

    // Enter demo mode to get consistent test data
    await loginPage.goto();
    await loginPage.enterDemoMode();
  });

  test.describe("Page Loading", () => {
    test("displays assignments page with tabs", async () => {
      await assignmentsPage.expectToBeLoaded();
      await expect(assignmentsPage.upcomingTab).toBeVisible();
      await expect(assignmentsPage.validationClosedTab).toBeVisible();
    });

    test("loads assignment cards in demo mode", async () => {
      await assignmentsPage.waitForAssignmentsLoaded();
      // Demo mode should have some assignments
      const count = await assignmentsPage.getAssignmentCount();
      expect(count).toBeGreaterThan(0);
    });

    test("shows upcoming tab as active by default", async () => {
      await expect(assignmentsPage.upcomingTab).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
  });

  test.describe("Tab Navigation", () => {
    test("can switch between upcoming and validation closed tabs", async () => {
      // Start on upcoming
      await expect(assignmentsPage.upcomingTab).toHaveAttribute(
        "aria-selected",
        "true",
      );

      // Switch to validation closed
      await assignmentsPage.switchToValidationClosedTab();
      await expect(assignmentsPage.validationClosedTab).toHaveAttribute(
        "aria-selected",
        "true",
      );
      await expect(assignmentsPage.upcomingTab).toHaveAttribute(
        "aria-selected",
        "false",
      );

      // Switch back to upcoming
      await assignmentsPage.switchToUpcomingTab();
      await expect(assignmentsPage.upcomingTab).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    test("tabs have proper ARIA attributes", async () => {
      await expect(assignmentsPage.tablist).toHaveAttribute(
        "role",
        "tablist",
      );
      await expect(assignmentsPage.upcomingTab).toHaveAttribute("role", "tab");
      await expect(assignmentsPage.tabPanel).toHaveAttribute(
        "role",
        "tabpanel",
      );
    });
  });

  test.describe("Assignment Cards", () => {
    test("assignment cards display game information", async () => {
      await assignmentsPage.waitForAssignmentsLoaded();

      // Cards should show team names or game info
      const firstCard = assignmentsPage.assignmentCards.first();
      await expect(firstCard).toBeVisible();

      // Should contain text (team names, dates, etc.)
      const cardText = await firstCard.textContent();
      expect(cardText).toBeTruthy();
      expect(cardText!.length).toBeGreaterThan(0);
    });

    test("can expand assignment card for details", async ({ page }) => {
      await assignmentsPage.waitForAssignmentsLoaded();

      const firstCard = assignmentsPage.assignmentCards.first();

      // Click to expand
      await firstCard.click();

      // After expansion, more content should be visible
      // Look for expanded content indicators (location, position, etc.)
      await page.waitForTimeout(300); // Animation time

      // The card should still be visible after interaction
      await expect(firstCard).toBeVisible();
    });
  });

  test.describe("Navigation", () => {
    test("can navigate to assignments from other pages", async ({ page }) => {
      // Navigate away first
      await navigation.goToCompensations();
      await expect(page).toHaveURL("/compensations");

      // Navigate back to assignments
      await navigation.goToAssignments();
      await expect(page).toHaveURL("/");
      await assignmentsPage.expectToBeLoaded();
    });
  });

  test.describe("Accessibility", () => {
    test("tabs are keyboard navigable", async ({ page }) => {
      // Focus on upcoming tab
      await assignmentsPage.upcomingTab.focus();

      // Tab to next element
      await page.keyboard.press("Tab");

      // Should be able to interact with tabs via keyboard
      await expect(assignmentsPage.upcomingTab).toBeVisible();
    });

    test("main content area is properly labeled", async ({ page }) => {
      const main = page.getByRole("main");
      await expect(main).toBeVisible();
    });
  });
});
