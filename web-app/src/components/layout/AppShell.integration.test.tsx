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

// Spy on the mock API's switchRoleAndAttribute
vi.spyOn(mockApi, "switchRoleAndAttribute");

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

    // Reset stores to initial state
    useAuthStore.setState({
      status: "idle",
      user: null,
      isDemoMode: false,
      activeOccupationId: null,
      error: null,
      csrfToken: null,
      _checkSessionPromise: null,
    });
    useDemoStore.getState().clearDemoData();
    useToastStore.getState().clearToasts();
  });

  afterEach(() => {
    vi.clearAllMocks();
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

      // Wait for the switch to complete
      await waitFor(() => {
        expect(mockApi.switchRoleAndAttribute).toHaveBeenCalled();
      });

      // The auth store should now have the new active occupation
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

    it("invalidates queries after switching", async () => {
      const user = userEvent.setup();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

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

      // Then verify queries were invalidated
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalled();
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

    it("shows optimistic UI update immediately", async () => {
      const user = userEvent.setup();
      renderAppShell();

      // Initially shows SV
      expect(
        screen.getByRole("button", { name: /referee.*SV/i }),
      ).toBeInTheDocument();

      // Open dropdown and select SVRBA
      await user.click(screen.getByRole("button", { name: /referee.*SV/i }));
      await user.click(screen.getByRole("option", { name: /SVRBA/i }));

      // Optimistic update: auth store should be updated immediately
      // (before API call completes)
      expect(useAuthStore.getState().activeOccupationId).toBe(
        "demo-referee-svrba",
      );
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated();
      useDemoStore.getState().setActiveAssociation("SV");
    });

    it("shows error toast when switch fails", async () => {
      // Mock API to reject
      vi.mocked(mockApi.switchRoleAndAttribute).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const user = userEvent.setup();
      renderAppShell();

      const dropdownButton = screen.getByRole("button", {
        name: /referee.*SV/i,
      });
      await user.click(dropdownButton);

      const svrbaOption = screen.getByRole("option", { name: /SVRBA/i });
      await user.click(svrbaOption);

      // Wait for error handling to complete
      await waitFor(() => {
        const toasts = useToastStore.getState().toasts;
        expect(toasts.some((t) => t.type === "error")).toBe(true);
      });
    });

    it("reverts optimistic update on error", async () => {
      // Mock API to reject
      vi.mocked(mockApi.switchRoleAndAttribute).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const user = userEvent.setup();
      renderAppShell();

      const initialOccupationId = useAuthStore.getState().activeOccupationId;
      expect(initialOccupationId).toBe("demo-referee-sv");

      // Open dropdown and try to switch
      await user.click(screen.getByRole("button", { name: /referee.*SV/i }));
      await user.click(screen.getByRole("option", { name: /SVRBA/i }));

      // Wait for error handling and revert
      await waitFor(() => {
        const currentOccupationId = useAuthStore.getState().activeOccupationId;
        // Should revert back to original
        expect(currentOccupationId).toBe("demo-referee-sv");
      });
    });

    it("does not invalidate queries on error", async () => {
      // Mock API to reject
      vi.mocked(mockApi.switchRoleAndAttribute).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const user = userEvent.setup();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      renderAppShell();

      await user.click(screen.getByRole("button", { name: /referee.*SV/i }));
      await user.click(screen.getByRole("option", { name: /SVRBA/i }));

      // Wait for error handling
      await waitFor(() => {
        const toasts = useToastStore.getState().toasts;
        expect(toasts.some((t) => t.type === "error")).toBe(true);
      });

      // Queries should not have been invalidated
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });
});
