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
      const hasCards = (await exchangesPage.getExchangeCount()) > 0;
      const hasEmptyState =
        (await exchangesPage.page.getByText(/no.*exchange/i).count()) > 0;
      expect(hasCards || hasEmptyState).toBe(true);
    });
  });

  test.describe("Tab Navigation", () => {
    test("can switch between open and my applications tabs", async () => {
      await expect(exchangesPage.openTab).toHaveAttribute(
        "aria-selected",
        "true",
      );

      await exchangesPage.switchToMyApplicationsTab();
      await exchangesPage.waitForExchangesLoaded();

      await exchangesPage.switchToOpenTab();
      await exchangesPage.waitForExchangesLoaded();
    });
  });

  test.describe("Level Filter (Demo Mode)", () => {
    test("level filter is visible on open exchanges tab", async () => {
      await exchangesPage.waitForLevelFilterVisible();
      const isVisible = await exchangesPage.isLevelFilterVisible();
      expect(isVisible).toBe(true);
    });

    test("level filter visibility changes with tab", async () => {
      await exchangesPage.waitForLevelFilterVisible();

      await exchangesPage.switchToMyApplicationsTab();
      await exchangesPage.waitForLevelFilterHidden();

      await exchangesPage.switchToOpenTab();
      await exchangesPage.waitForLevelFilterVisible();
    });
  });

  test.describe("Exchange Cards", () => {
    test("exchange cards display game information", async () => {
      await exchangesPage.waitForExchangesLoaded();
      const count = await exchangesPage.getExchangeCount();

      if (count > 0) {
        const firstCard = exchangesPage.exchangeCards.first();
        await expect(firstCard).toBeVisible();

        const cardText = await firstCard.textContent();
        expect(cardText).toBeTruthy();
        expect(cardText!.length).toBeGreaterThan(0);
      }
    });

    test("can expand exchange card for details", async () => {
      await exchangesPage.waitForExchangesLoaded();
      const count = await exchangesPage.getExchangeCount();

      if (count > 0) {
        const firstCard = exchangesPage.exchangeCards.first();
        // Ensure card is visible before clicking
        await expect(firstCard).toBeVisible();
        await firstCard.click();
        // Verify card remains visible after click (Playwright auto-waits)
        await expect(firstCard).toBeVisible();
      }
    });
  });

  test.describe("Navigation", () => {
    test("can navigate from exchange page to other pages", async ({ page }) => {
      await navigation.goToAssignments();
      await expect(page).toHaveURL("/");

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
