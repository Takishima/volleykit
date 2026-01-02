import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "./AppShell";
import { useAuthStore } from "@/stores/auth";
import { useDemoStore } from "@/stores/demo";
import { useToastStore } from "@/stores/toast";
import { setLocale } from "@/i18n";
import { mockApi } from "@/api/mock-api";

// Save the original function before any spying
const originalSwitchRoleAndAttribute = mockApi.switchRoleAndAttribute.bind(
  mockApi,
);

describe("AppShell Integration", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    setLocale("en");
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Restore original function and create fresh spy for each test
    mockApi.switchRoleAndAttribute = originalSwitchRoleAndAttribute;
    vi.spyOn(mockApi, "switchRoleAndAttribute");

    // Reset stores to initial state
    useAuthStore.setState({
      status: "idle",
      user: null,
      isDemoMode: false,
      activeOccupationId: null,
      isAssociationSwitching: false,
      error: null,
      csrfToken: null,
      _checkSessionPromise: null,
    });
    useDemoStore.getState().clearDemoData();
    useToastStore.getState().clearToasts();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
    useToastStore.getState().clearToasts();
  });

  function renderAppShell() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  describe("association switching", () => {
    beforeEach(() => {
      // Enter demo mode with multiple associations
      // This sets up auth store with demo user
      useAuthStore.getState().setDemoAuthenticated();
      // Initialize demo store with SV data (mock API will update this on switch)
      useDemoStore.getState().setActiveAssociation("SV");
    });

    it("calls switchRoleAndAttribute API when switching associations", async () => {
      const user = userEvent.setup();
      renderAppShell();

      // Find and click the dropdown button (shows current association)
      const dropdownButton = screen.getByRole("button", {
        name: /referee.*SV/i,
      });
      expect(dropdownButton).toBeInTheDocument();

      await user.click(dropdownButton);

      // Find and click a different association option
      const svrbaOption = await screen.findByRole("option", {
        name: /SVRBA/i,
      });
      await user.click(svrbaOption);

      // Verify the API was called with the correct occupation ID
      await waitFor(() => {
        expect(mockApi.switchRoleAndAttribute).toHaveBeenCalledWith(
          "demo-referee-svrba",
        );
      });
    });

    it("updates active occupation after switching", async () => {
      const user = userEvent.setup();
      renderAppShell();

      // Initial state should show SV
      const dropdownButton = screen.getByRole("button", {
        name: /referee.*SV/i,
      });
      await user.click(dropdownButton);

      // Select SVRBA
      const svrbaOption = await screen.findByRole("option", {
        name: /SVRBA/i,
      });
      await user.click(svrbaOption);

      // The auth store should now have the new active occupation
      // (state only updates after API call succeeds, so this implicitly verifies the API was called)
      await waitFor(() => {
        const state = useAuthStore.getState();
        expect(state.activeOccupationId).toBe("demo-referee-svrba");
      });
    });

    it("updates demo store association after switching", async () => {
      const user = userEvent.setup();
      renderAppShell();

      // Initial demo store state
      const initialAssociation = useDemoStore.getState().activeAssociationCode;
      expect(initialAssociation).toBe("SV");

      // Open dropdown and switch
      const dropdownButton = screen.getByRole("button", {
        name: /referee.*SV/i,
      });
      await user.click(dropdownButton);

      const svrzOption = await screen.findByRole("option", {
        name: /SVRZ/i,
      });
      await user.click(svrzOption);

      // Wait for the switch to complete and demo store to update
      await waitFor(() => {
        const newAssociation = useDemoStore.getState().activeAssociationCode;
        expect(newAssociation).toBe("SVRZ");
      });
    });

    it("resets queries after switching to clear old data", async () => {
      const user = userEvent.setup();
      const resetSpy = vi.spyOn(queryClient, "resetQueries");

      renderAppShell();

      const dropdownButton = screen.getByRole("button", {
        name: /referee.*SV/i,
      });
      await user.click(dropdownButton);

      const svrbaOption = await screen.findByRole("option", {
        name: /SVRBA/i,
      });
      await user.click(svrbaOption);

      // Wait for the API call to complete first
      await waitFor(() => {
        expect(mockApi.switchRoleAndAttribute).toHaveBeenCalled();
      });

      // Then verify queries were reset (clears cache for immediate loading state)
      await waitFor(() => {
        expect(resetSpy).toHaveBeenCalled();
      });
    });

    it("closes dropdown after selection", async () => {
      const user = userEvent.setup();
      renderAppShell();

      const dropdownButton = screen.getByRole("button", {
        name: /referee.*SV/i,
      });
      await user.click(dropdownButton);

      // Dropdown should be open (listbox visible)
      const listbox = screen.getByRole("listbox");
      expect(listbox).toBeVisible();

      // Select an option
      const svrbaOption = screen.getByRole("option", { name: /SVRBA/i });
      await user.click(svrbaOption);

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });
    });

    it("updates auth store after API call succeeds", async () => {
      const user = userEvent.setup();
      renderAppShell();

      // Initially shows SV
      expect(
        screen.getByRole("button", { name: /referee.*SV/i }),
      ).toBeInTheDocument();

      // Open dropdown and select SVRBA
      await user.click(screen.getByRole("button", { name: /referee.*SV/i }));
      await user.click(screen.getByRole("option", { name: /SVRBA/i }));

      // State is updated AFTER the API call succeeds (not optimistically)
      // This prevents race conditions where queries refetch with wrong context
      await waitFor(() => {
        expect(useAuthStore.getState().activeOccupationId).toBe(
          "demo-referee-svrba",
        );
      });
    });
  });

});
// Note: Error handling tests moved to AppShell.error.test.tsx for proper test isolation.
// Mock function state was persisting between success and error test suites, causing the
// error test's mockRejectedValue to not take effect when run after success tests.
