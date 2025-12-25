import { test, expect } from "@playwright/test";
import { LoginPage, CompensationsPage, NavigationPage } from "./pages";

test.describe("Compensations Journey", () => {
  let loginPage: LoginPage;
  let compensationsPage: CompensationsPage;
  let navigation: NavigationPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    compensationsPage = new CompensationsPage(page);
    navigation = new NavigationPage(page);

    await loginPage.goto();
    await loginPage.enterDemoMode();
    await navigation.goToCompensations();
  });

  test.describe("Page Loading", () => {
    test("displays compensations page with tabs", async () => {
      await compensationsPage.expectToBeLoaded();
      await expect(compensationsPage.pendingTab).toBeVisible();
      await expect(compensationsPage.paidTab).toBeVisible();
      await expect(compensationsPage.allTab).toBeVisible();
    });

    test("loads compensation totals", async ({ page }) => {
      await expect(page.getByText(/CHF/).first()).toBeVisible();
    });

    test("shows pending tab as active by default", async () => {
      await expect(compensationsPage.pendingTab).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
  });

  test.describe("Tab Filtering", () => {
    test("can switch between pending, paid, and all tabs", async () => {
      await expect(compensationsPage.pendingTab).toHaveAttribute(
        "aria-selected",
        "true",
      );

      await compensationsPage.switchToPaidTab();
      await compensationsPage.waitForCompensationsLoaded();

      await compensationsPage.switchToAllTab();
      await compensationsPage.waitForCompensationsLoaded();

      await compensationsPage.switchToPendingTab();
      await compensationsPage.waitForCompensationsLoaded();
    });

    test("different tabs show different data sets", async () => {
      await compensationsPage.waitForCompensationsLoaded();
      const pendingCount = await compensationsPage.getCompensationCount();

      await compensationsPage.switchToAllTab();
      await compensationsPage.waitForCompensationsLoaded();
      const allCount = await compensationsPage.getCompensationCount();

      expect(allCount).toBeGreaterThanOrEqual(pendingCount);
    });
  });

  test.describe("Compensation Cards", () => {
    test("compensation cards display amount information", async () => {
      await compensationsPage.waitForCompensationsLoaded();
      const count = await compensationsPage.getCompensationCount();

      if (count > 0) {
        const firstCard = compensationsPage.compensationCards.first();
        await expect(firstCard).toBeVisible();

        const cardText = await firstCard.textContent();
        expect(cardText).toBeTruthy();
      }
    });

    test("can expand compensation card for details", async () => {
      await compensationsPage.waitForCompensationsLoaded();
      const count = await compensationsPage.getCompensationCount();

      if (count > 0) {
        const firstCard = compensationsPage.compensationCards.first();
        // Ensure card is visible before clicking
        await expect(firstCard).toBeVisible();
        await firstCard.click();
        // Verify card remains visible after click (Playwright auto-waits)
        await expect(firstCard).toBeVisible();
      }
    });
  });

  test.describe("Totals Display", () => {
    test("shows pending and received totals", async ({ page }) => {
      const chfAmounts = page.locator("text=/CHF/");
      const count = await chfAmounts.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe("Navigation", () => {
    test("can navigate between compensations and other pages", async ({
      page,
    }) => {
      await navigation.goToExchange();
      await expect(page).toHaveURL("/exchange");

      await navigation.goToCompensations();
      await expect(page).toHaveURL("/compensations");
      await compensationsPage.expectToBeLoaded();
    });
  });

  test.describe("Accessibility", () => {
    test("tabs follow WAI-ARIA tab pattern", async () => {
      await expect(compensationsPage.tablist).toHaveAttribute(
        "role",
        "tablist",
      );
      await expect(compensationsPage.pendingTab).toHaveAttribute("role", "tab");
      await expect(compensationsPage.tabPanel).toHaveAttribute(
        "role",
        "tabpanel",
      );
    });

    test("tab panel is associated with active tab", async () => {
      await expect(compensationsPage.tabPanel).toHaveAttribute(
        "aria-labelledby",
      );
    });
  });
});
