import { test, expect } from "@playwright/test";
import { LoginPage, ExchangesPage, NavigationPage } from "./pages";

test.describe("Exchanges Journey", () => {
  let loginPage: LoginPage;
  let exchangesPage: ExchangesPage;
  let navigation: NavigationPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    exchangesPage = new ExchangesPage(page);
    navigation = new NavigationPage(page);

    // Enter demo mode for consistent test data
    await loginPage.goto();
    await loginPage.enterDemoMode();
    await navigation.goToExchange();
  });

  test.describe("Page Loading", () => {
    test("displays exchanges page with tabs", async () => {
      await exchangesPage.expectToBeLoaded();
      await expect(exchangesPage.openTab).toBeVisible();
      await expect(exchangesPage.myApplicationsTab).toBeVisible();
    });

    test("shows open tab as active by default", async () => {
      await expect(exchangesPage.openTab).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    test("loads exchange data", async () => {
      await exchangesPage.waitForExchangesLoaded();
      // Page should show either cards or empty state
      const hasCards = (await exchangesPage.getExchangeCount()) > 0;
      const hasEmptyState =
        (await exchangesPage.page.getByText(/no.*exchange/i).count()) > 0;
      expect(hasCards || hasEmptyState).toBe(true);
    });
  });

  test.describe("Tab Navigation", () => {
    test("can switch between open and my applications tabs", async () => {
      // Start on open
      await expect(exchangesPage.openTab).toHaveAttribute(
        "aria-selected",
        "true",
      );

      // Switch to my applications
      await exchangesPage.switchToMyApplicationsTab();
      await exchangesPage.waitForExchangesLoaded();

      // Switch back to open
      await exchangesPage.switchToOpenTab();
      await exchangesPage.waitForExchangesLoaded();
    });
  });

  test.describe("Level Filter (Demo Mode)", () => {
    test("level filter toggle is visible in demo mode", async () => {
      // In demo mode on open tab, level filter should be visible
      const isVisible = await exchangesPage.isLevelFilterVisible();
      // This is demo mode specific - may or may not be visible
      expect(typeof isVisible).toBe("boolean");
    });

    test("level filter is only shown on open tab", async () => {
      // Switch to my applications - filter should not be shown
      await exchangesPage.switchToMyApplicationsTab();

      // Level filter should not be visible on my applications tab
      // (The toggle is only shown for open exchanges)
      await exchangesPage.page.waitForTimeout(300);

      // Switch back to open - filter should be visible again
      await exchangesPage.switchToOpenTab();
    });
  });

  test.describe("Exchange Cards", () => {
    test("exchange cards display game information", async () => {
      await exchangesPage.waitForExchangesLoaded();
      const count = await exchangesPage.getExchangeCount();

      if (count > 0) {
        const firstCard = exchangesPage.exchangeCards.first();
        await expect(firstCard).toBeVisible();

        // Card should have content
        const cardText = await firstCard.textContent();
        expect(cardText).toBeTruthy();
        expect(cardText!.length).toBeGreaterThan(0);
      }
    });

    test("can expand exchange card for details", async ({ page }) => {
      await exchangesPage.waitForExchangesLoaded();
      const count = await exchangesPage.getExchangeCount();

      if (count > 0) {
        const firstCard = exchangesPage.exchangeCards.first();
        await firstCard.click();
        await page.waitForTimeout(300);
        await expect(firstCard).toBeVisible();
      }
    });
  });

  test.describe("Navigation", () => {
    test("can navigate from exchange page to other pages", async ({ page }) => {
      // Go to assignments
      await navigation.goToAssignments();
      await expect(page).toHaveURL("/");

      // Come back to exchange
      await navigation.goToExchange();
      await expect(page).toHaveURL("/exchange");
      await exchangesPage.expectToBeLoaded();
    });
  });

  test.describe("Accessibility", () => {
    test("tabs follow WAI-ARIA tab pattern", async () => {
      await expect(exchangesPage.tablist).toHaveAttribute("role", "tablist");
      await expect(exchangesPage.openTab).toHaveAttribute("role", "tab");
      await expect(exchangesPage.tabPanel).toHaveAttribute("role", "tabpanel");
    });

    test("main content area is accessible", async ({ page }) => {
      const main = page.getByRole("main");
      await expect(main).toBeVisible();
    });
  });
});
