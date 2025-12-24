import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { PWAProvider, usePWA } from "./PWAContext";

// Mock the virtual:pwa-register module
vi.mock("virtual:pwa-register", () => ({
  registerSW: vi.fn(),
}));

// Test component that uses the PWA context
function TestConsumer() {
  const {
    offlineReady,
    needRefresh,
    isChecking,
    lastChecked,
    checkError,
    registrationError,
    checkForUpdate,
    updateApp,
    dismissPrompt,
  } = usePWA();

  return (
    <div>
      <span data-testid="offlineReady">{String(offlineReady)}</span>
      <span data-testid="needRefresh">{String(needRefresh)}</span>
      <span data-testid="isChecking">{String(isChecking)}</span>
      <span data-testid="lastChecked">{lastChecked?.toISOString() ?? "null"}</span>
      <span data-testid="checkError">{checkError?.message ?? "null"}</span>
      <span data-testid="registrationError">
        {registrationError?.message ?? "null"}
      </span>
      <button data-testid="checkForUpdate" onClick={checkForUpdate}>
        Check
      </button>
      <button data-testid="updateApp" onClick={updateApp}>
        Update
      </button>
      <button data-testid="dismissPrompt" onClick={dismissPrompt}>
        Dismiss
      </button>
    </div>
  );
}

describe("PWAContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set PWA as enabled for tests
    vi.stubGlobal("__PWA_ENABLED__", true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("usePWA hook", () => {
    it("returns safe defaults when used outside PWAProvider", () => {
      // Temporarily disable PWA for this test
      vi.stubGlobal("__PWA_ENABLED__", false);

      render(<TestConsumer />);

      expect(screen.getByTestId("offlineReady")).toHaveTextContent("false");
      expect(screen.getByTestId("needRefresh")).toHaveTextContent("false");
      expect(screen.getByTestId("isChecking")).toHaveTextContent("false");
      expect(screen.getByTestId("lastChecked")).toHaveTextContent("null");
    });

    it("returns context values when used inside PWAProvider", async () => {
      const mockRegisterSW = vi.fn().mockReturnValue(vi.fn());
      const { registerSW } = await import("virtual:pwa-register");
      vi.mocked(registerSW).mockImplementation(mockRegisterSW);

      render(
        <PWAProvider>
          <TestConsumer />
        </PWAProvider>,
      );

      expect(screen.getByTestId("offlineReady")).toHaveTextContent("false");
      expect(screen.getByTestId("needRefresh")).toHaveTextContent("false");
      expect(screen.getByTestId("isChecking")).toHaveTextContent("false");
    });
  });

  describe("PWAProvider", () => {
    it("registers service worker when PWA is enabled", async () => {
      const mockUpdateSW = vi.fn();
      const mockRegisterSW = vi.fn().mockReturnValue(mockUpdateSW);
      const { registerSW } = await import("virtual:pwa-register");
      vi.mocked(registerSW).mockImplementation(mockRegisterSW);

      render(
        <PWAProvider>
          <TestConsumer />
        </PWAProvider>,
      );

      await waitFor(() => {
        expect(mockRegisterSW).toHaveBeenCalledWith(
          expect.objectContaining({
            immediate: true,
          }),
        );
      });
    });

    // Note: "PWA disabled" behavior is tested implicitly by the build process
    // When __PWA_ENABLED__ is false, PWAProviderInternal is not loaded at all
    // due to conditional lazy loading, so registerSW is never called.

    it("sets offlineReady when onOfflineReady callback is called", async () => {
      let onOfflineReadyCallback: (() => void) | undefined;
      const mockRegisterSW = vi.fn((options) => {
        onOfflineReadyCallback = options?.onOfflineReady;
        return vi.fn();
      });
      const { registerSW } = await import("virtual:pwa-register");
      vi.mocked(registerSW).mockImplementation(mockRegisterSW);

      render(
        <PWAProvider>
          <TestConsumer />
        </PWAProvider>,
      );

      await waitFor(() => {
        expect(onOfflineReadyCallback).toBeDefined();
      });

      act(() => {
        onOfflineReadyCallback?.();
      });

      expect(screen.getByTestId("offlineReady")).toHaveTextContent("true");
    });

    it("sets needRefresh when onNeedRefresh callback is called", async () => {
      let onNeedRefreshCallback: (() => void) | undefined;
      const mockRegisterSW = vi.fn((options) => {
        onNeedRefreshCallback = options?.onNeedRefresh;
        return vi.fn();
      });
      const { registerSW } = await import("virtual:pwa-register");
      vi.mocked(registerSW).mockImplementation(mockRegisterSW);

      render(
        <PWAProvider>
          <TestConsumer />
        </PWAProvider>,
      );

      await waitFor(() => {
        expect(onNeedRefreshCallback).toBeDefined();
      });

      act(() => {
        onNeedRefreshCallback?.();
      });

      expect(screen.getByTestId("needRefresh")).toHaveTextContent("true");
    });

    it("sets registrationError when onRegisterError is called", async () => {
      let onRegisterErrorCallback: ((error: Error) => void) | undefined;
      const mockRegisterSW = vi.fn((options) => {
        onRegisterErrorCallback = options?.onRegisterError;
        return vi.fn();
      });
      const { registerSW } = await import("virtual:pwa-register");
      vi.mocked(registerSW).mockImplementation(mockRegisterSW);

      render(
        <PWAProvider>
          <TestConsumer />
        </PWAProvider>,
      );

      await waitFor(() => {
        expect(onRegisterErrorCallback).toBeDefined();
      });

      expect(screen.getByTestId("registrationError")).toHaveTextContent("null");

      act(() => {
        onRegisterErrorCallback?.(new Error("Registration failed"));
      });

      expect(screen.getByTestId("registrationError")).toHaveTextContent(
        "Registration failed",
      );
    });

    it("sets registrationError when registerSW throws", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const mockRegisterSW = vi.fn().mockImplementation(() => {
        throw new Error("Import failed");
      });
      const { registerSW } = await import("virtual:pwa-register");
      vi.mocked(registerSW).mockImplementation(mockRegisterSW);

      render(
        <PWAProvider>
          <TestConsumer />
        </PWAProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("registrationError")).toHaveTextContent(
          "Import failed",
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it("clears interval on unmount", async () => {
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
      const mockRegistration = { update: vi.fn() };

      let onRegisteredSWCallback:
        | ((url: string, reg: ServiceWorkerRegistration) => void)
        | undefined;
      const mockRegisterSW = vi.fn((options) => {
        onRegisteredSWCallback = options?.onRegisteredSW;
        return vi.fn();
      });
      const { registerSW } = await import("virtual:pwa-register");
      vi.mocked(registerSW).mockImplementation(mockRegisterSW);

      const { unmount } = render(
        <PWAProvider>
          <TestConsumer />
        </PWAProvider>,
      );

      await waitFor(() => {
        expect(onRegisteredSWCallback).toBeDefined();
      });

      // Simulate registration which sets up interval
      act(() => {
        onRegisteredSWCallback?.(
          "sw.js",
          mockRegistration as unknown as ServiceWorkerRegistration,
        );
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe("dismissPrompt", () => {
    it("resets offlineReady and needRefresh to false", async () => {
      let onOfflineReadyCallback: (() => void) | undefined;
      let onNeedRefreshCallback: (() => void) | undefined;
      const mockRegisterSW = vi.fn((options) => {
        onOfflineReadyCallback = options?.onOfflineReady;
        onNeedRefreshCallback = options?.onNeedRefresh;
        return vi.fn();
      });
      const { registerSW } = await import("virtual:pwa-register");
      vi.mocked(registerSW).mockImplementation(mockRegisterSW);

      render(
        <PWAProvider>
          <TestConsumer />
        </PWAProvider>,
      );

      await waitFor(() => {
        expect(onOfflineReadyCallback).toBeDefined();
      });

      // Set both states to true
      act(() => {
        onOfflineReadyCallback?.();
        onNeedRefreshCallback?.();
      });

      expect(screen.getByTestId("offlineReady")).toHaveTextContent("true");
      expect(screen.getByTestId("needRefresh")).toHaveTextContent("true");

      // Dismiss the prompt
      act(() => {
        screen.getByTestId("dismissPrompt").click();
      });

      expect(screen.getByTestId("offlineReady")).toHaveTextContent("false");
      expect(screen.getByTestId("needRefresh")).toHaveTextContent("false");
    });
  });

  describe("checkForUpdate", () => {
    it("does nothing when called before SW registration completes", async () => {
      // Mock that never calls onRegisteredSW (simulating slow registration)
      const mockRegisterSW = vi.fn().mockReturnValue(vi.fn());
      const { registerSW } = await import("virtual:pwa-register");
      vi.mocked(registerSW).mockImplementation(mockRegisterSW);

      render(
        <PWAProvider>
          <TestConsumer />
        </PWAProvider>,
      );

      await waitFor(() => {
        expect(mockRegisterSW).toHaveBeenCalled();
      });

      // Try to check for update before registration completes
      // This should be a no-op since registrationRef is still null
      await act(async () => {
        screen.getByTestId("checkForUpdate").click();
      });

      // Verify isChecking never went true (no update attempt was made)
      expect(screen.getByTestId("isChecking")).toHaveTextContent("false");
      expect(screen.getByTestId("lastChecked")).toHaveTextContent("null");
    });

    it("calls registration.update() when triggered", async () => {
      const mockRegistration = {
        update: vi.fn().mockResolvedValue(undefined),
      };

      let onRegisteredSWCallback:
        | ((url: string, reg: ServiceWorkerRegistration) => void)
        | undefined;
      const mockRegisterSW = vi.fn((options) => {
        onRegisteredSWCallback = options?.onRegisteredSW;
        return vi.fn();
      });
      const { registerSW } = await import("virtual:pwa-register");
      vi.mocked(registerSW).mockImplementation(mockRegisterSW);

      render(
        <PWAProvider>
          <TestConsumer />
        </PWAProvider>,
      );

      await waitFor(() => {
        expect(onRegisteredSWCallback).toBeDefined();
      });

      // Simulate registration
      act(() => {
        onRegisteredSWCallback?.(
          "sw.js",
          mockRegistration as unknown as ServiceWorkerRegistration,
        );
      });

      // Trigger update check
      await act(async () => {
        screen.getByTestId("checkForUpdate").click();
      });

      expect(mockRegistration.update).toHaveBeenCalled();
    });

    it("sets lastChecked after successful update check", async () => {
      const mockRegistration = {
        update: vi.fn().mockResolvedValue(undefined),
      };

      let onRegisteredSWCallback:
        | ((url: string, reg: ServiceWorkerRegistration) => void)
        | undefined;
      const mockRegisterSW = vi.fn((options) => {
        onRegisteredSWCallback = options?.onRegisteredSW;
        return vi.fn();
      });
      const { registerSW } = await import("virtual:pwa-register");
      vi.mocked(registerSW).mockImplementation(mockRegisterSW);

      render(
        <PWAProvider>
          <TestConsumer />
        </PWAProvider>,
      );

      await waitFor(() => {
        expect(onRegisteredSWCallback).toBeDefined();
      });

      act(() => {
        onRegisteredSWCallback?.(
          "sw.js",
          mockRegistration as unknown as ServiceWorkerRegistration,
        );
      });

      expect(screen.getByTestId("lastChecked")).toHaveTextContent("null");

      await act(async () => {
        screen.getByTestId("checkForUpdate").click();
      });

      expect(screen.getByTestId("lastChecked")).not.toHaveTextContent("null");
    });

    it("sets checkError when update check fails", async () => {
      const mockRegistration = {
        update: vi.fn().mockRejectedValue(new Error("Network error")),
      };

      let onRegisteredSWCallback:
        | ((url: string, reg: ServiceWorkerRegistration) => void)
        | undefined;
      const mockRegisterSW = vi.fn((options) => {
        onRegisteredSWCallback = options?.onRegisteredSW;
        return vi.fn();
      });
      const { registerSW } = await import("virtual:pwa-register");
      vi.mocked(registerSW).mockImplementation(mockRegisterSW);

      render(
        <PWAProvider>
          <TestConsumer />
        </PWAProvider>,
      );

      await waitFor(() => {
        expect(onRegisteredSWCallback).toBeDefined();
      });

      act(() => {
        onRegisteredSWCallback?.(
          "sw.js",
          mockRegistration as unknown as ServiceWorkerRegistration,
        );
      });

      expect(screen.getByTestId("checkError")).toHaveTextContent("null");

      await act(async () => {
        screen.getByTestId("checkForUpdate").click();
      });

      expect(screen.getByTestId("checkError")).toHaveTextContent("Network error");
    });

    it("clears checkError on next successful check", async () => {
      let shouldFail = true;
      const mockRegistration = {
        update: vi.fn().mockImplementation(() => {
          if (shouldFail) {
            return Promise.reject(new Error("Network error"));
          }
          return Promise.resolve(undefined);
        }),
      };

      let onRegisteredSWCallback:
        | ((url: string, reg: ServiceWorkerRegistration) => void)
        | undefined;
      const mockRegisterSW = vi.fn((options) => {
        onRegisteredSWCallback = options?.onRegisteredSW;
        return vi.fn();
      });
      const { registerSW } = await import("virtual:pwa-register");
      vi.mocked(registerSW).mockImplementation(mockRegisterSW);

      render(
        <PWAProvider>
          <TestConsumer />
        </PWAProvider>,
      );

      await waitFor(() => {
        expect(onRegisteredSWCallback).toBeDefined();
      });

      act(() => {
        onRegisteredSWCallback?.(
          "sw.js",
          mockRegistration as unknown as ServiceWorkerRegistration,
        );
      });

      // First check fails
      await act(async () => {
        screen.getByTestId("checkForUpdate").click();
      });

      expect(screen.getByTestId("checkError")).toHaveTextContent("Network error");

      // Second check succeeds
      shouldFail = false;
      await act(async () => {
        screen.getByTestId("checkForUpdate").click();
      });

      expect(screen.getByTestId("checkError")).toHaveTextContent("null");
    });

    it("prevents concurrent update checks (race condition guard)", async () => {
      let resolveUpdate: () => void;
      const mockRegistration = {
        update: vi.fn().mockImplementation(
          () =>
            new Promise<void>((resolve) => {
              resolveUpdate = resolve;
            }),
        ),
      };

      let onRegisteredSWCallback:
        | ((url: string, reg: ServiceWorkerRegistration) => void)
        | undefined;
      const mockRegisterSW = vi.fn((options) => {
        onRegisteredSWCallback = options?.onRegisteredSW;
        return vi.fn();
      });
      const { registerSW } = await import("virtual:pwa-register");
      vi.mocked(registerSW).mockImplementation(mockRegisterSW);

      render(
        <PWAProvider>
          <TestConsumer />
        </PWAProvider>,
      );

      await waitFor(() => {
        expect(onRegisteredSWCallback).toBeDefined();
      });

      act(() => {
        onRegisteredSWCallback?.(
          "sw.js",
          mockRegistration as unknown as ServiceWorkerRegistration,
        );
      });

      // Start first update check (don't await)
      act(() => {
        screen.getByTestId("checkForUpdate").click();
      });

      // Try to start second update check while first is pending
      act(() => {
        screen.getByTestId("checkForUpdate").click();
      });

      // Only one call should have been made
      expect(mockRegistration.update).toHaveBeenCalledTimes(1);

      // Resolve the pending update
      await act(async () => {
        resolveUpdate!();
      });
    });
  });

  describe("updateApp", () => {
    it("logs warning when SW is not ready", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      // Don't set up a proper registration - updateSWRef will be null
      const mockRegisterSW = vi.fn().mockReturnValue(null);
      const { registerSW } = await import("virtual:pwa-register");
      vi.mocked(registerSW).mockImplementation(mockRegisterSW);

      render(
        <PWAProvider>
          <TestConsumer />
        </PWAProvider>,
      );

      await waitFor(() => {
        expect(mockRegisterSW).toHaveBeenCalled();
      });

      await act(async () => {
        screen.getByTestId("updateApp").click();
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[VolleyKit][App]",
        "updateApp called but service worker is not ready",
      );
      consoleWarnSpy.mockRestore();
    });

    it("calls updateSW with true to reload page", async () => {
      const mockUpdateSW = vi.fn().mockResolvedValue(undefined);
      const mockRegisterSW = vi.fn().mockReturnValue(mockUpdateSW);
      const { registerSW } = await import("virtual:pwa-register");
      vi.mocked(registerSW).mockImplementation(mockRegisterSW);

      render(
        <PWAProvider>
          <TestConsumer />
        </PWAProvider>,
      );

      await waitFor(() => {
        expect(mockRegisterSW).toHaveBeenCalled();
      });

      await act(async () => {
        screen.getByTestId("updateApp").click();
      });

      expect(mockUpdateSW).toHaveBeenCalledWith(true);
    });
  });
});
