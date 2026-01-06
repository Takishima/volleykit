/**
 * Error handling tests for AppShell association switching.
 *
 * These tests are isolated in a separate file because mock function state
 * was persisting between success and error test suites when they shared
 * the same file. The vi.spyOn() mock setup for success tests interfered
 * with the mockRejectedValue() configuration needed for error tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "./AppShell";
import { useAuthStore } from "@/shared/stores/auth";
import { useDemoStore } from "@/shared/stores/demo";
import { useToastStore } from "@/shared/stores/toast";
import { setLocale } from "@/i18n";
import { mockApi } from "@/api/mock-api";

// Save the original function before any mocking
const originalSwitchRoleAndAttribute = mockApi.switchRoleAndAttribute.bind(
  mockApi,
);

describe("AppShell Error Handling", () => {
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

    // Set up demo mode with SV association
    useAuthStore.getState().setDemoAuthenticated();
    useDemoStore.getState().setActiveAssociation("SV");

    // Explicitly ensure the activeOccupationId is reset to SV
    useAuthStore.setState({
      activeOccupationId: "demo-referee-sv",
      isAssociationSwitching: false,
    });

    // Clear any existing toasts
    useToastStore.getState().clearToasts();

    // Mock the API to reject
    mockApi.switchRoleAndAttribute = vi
      .fn()
      .mockRejectedValue(new Error("Network error"));
  });

  afterEach(() => {
    // Restore original function
    mockApi.switchRoleAndAttribute = originalSwitchRoleAndAttribute;
    vi.restoreAllMocks();
    queryClient.clear();
    useToastStore.getState().clearToasts();

    // Reset stores
    useAuthStore.setState({
      status: "idle",
      user: null,
      dataSource: "api",
      activeOccupationId: null,
      isAssociationSwitching: false,
      error: null,
      csrfToken: null,
      _checkSessionPromise: null,
    });
    useDemoStore.getState().clearDemoData();
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

  it("does not reset queries on error and shows toast", async () => {
    const user = userEvent.setup();
    const resetSpy = vi.spyOn(queryClient, "resetQueries");

    renderAppShell();

    await user.click(screen.getByRole("button", { name: "SV" }));
    const svrbaOption = await screen.findByRole("option", {
      name: "SVRBA",
    });
    await user.click(svrbaOption);

    // Wait for the error toast to appear (indicates error was handled)
    await waitFor(() => {
      const toasts = useToastStore.getState().toasts;
      expect(toasts.some((t) => t.type === "error")).toBe(true);
    });

    // Queries should not have been reset (preserves current data on error)
    expect(resetSpy).not.toHaveBeenCalled();

    // Verify switching state is cleared after error
    expect(useAuthStore.getState().isAssociationSwitching).toBe(false);

    // Verify the mock was called
    expect(mockApi.switchRoleAndAttribute).toHaveBeenCalledWith(
      "demo-referee-svrba",
    );
  });
});
