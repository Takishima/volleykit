import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSafeMutation } from "./useSafeMutation";
import * as authStore from "@/stores/auth";
import * as settingsStore from "@/stores/settings";
import { toast } from "@/stores/toast";
import type { TranslationKey } from "@/i18n";

// Test translation keys (cast for type safety in tests)
const TEST_ERROR = "compensations.pdfDownloadFailed" as TranslationKey;
const TEST_SUCCESS = "exchange.applySuccess" as TranslationKey;

vi.mock("@/stores/auth");
vi.mock("@/stores/settings");
vi.mock("@/stores/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: "en",
  }),
}));
vi.mock("@/i18n", () => ({
  t: (key: string) => key,
  getLocale: () => "en",
  setLocale: vi.fn(),
  setLocaleImmediate: vi.fn(),
}));

describe("useSafeMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: not in demo mode, safe mode disabled
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ dataSource: "api" } as ReturnType<
        typeof authStore.useAuthStore.getState
      >),
    );

    vi.mocked(settingsStore.useSettingsStore).mockImplementation((selector) =>
      selector({ isSafeModeEnabled: false } as ReturnType<
        typeof settingsStore.useSettingsStore.getState
      >),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should execute mutation successfully", async () => {
    const mutationFn = vi.fn().mockResolvedValue("result");
    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      useSafeMutation(mutationFn, {
        logContext: "testContext",
        errorMessage: TEST_ERROR,
        onSuccess,
      }),
    );

    await act(async () => {
      const returnValue = await result.current.execute("arg");
      expect(returnValue).toBe("result");
    });

    expect(mutationFn).toHaveBeenCalledWith("arg", expect.any(Object));
    expect(onSuccess).toHaveBeenCalledWith("result");
  });

  it("should show success toast when successMessage is provided", async () => {
    const mutationFn = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useSafeMutation(mutationFn, {
        logContext: "testContext",
        successMessage: TEST_SUCCESS,
        errorMessage: TEST_ERROR,
      }),
    );

    await act(async () => {
      await result.current.execute("arg");
    });

    expect(toast.success).toHaveBeenCalledWith(TEST_SUCCESS);
  });

  it("should not show success toast when successMessage is not provided", async () => {
    const mutationFn = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useSafeMutation(mutationFn, {
        logContext: "testContext",
        errorMessage: TEST_ERROR,
      }),
    );

    await act(async () => {
      await result.current.execute("arg");
    });

    expect(toast.success).not.toHaveBeenCalled();
  });

  it("should show error toast on failure", async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error("Network error"));
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useSafeMutation(mutationFn, {
        logContext: "testContext",
        errorMessage: TEST_ERROR,
        onError,
      }),
    );

    await act(async () => {
      const returnValue = await result.current.execute("arg");
      expect(returnValue).toBeUndefined();
    });

    expect(toast.error).toHaveBeenCalledWith(TEST_ERROR);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("should prevent concurrent executions (race condition protection)", async () => {
    let resolveFirst: () => void;
    const firstPromise = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });

    const mutationFn = vi.fn().mockReturnValue(firstPromise);

    const { result } = renderHook(() =>
      useSafeMutation(mutationFn, {
        logContext: "testContext",
        errorMessage: TEST_ERROR,
      }),
    );

    // Start first execution (don't await)
    const promise1 = result.current.execute("arg1");

    // Try to start second execution immediately
    const promise2 = result.current.execute("arg2");

    // Resolve first
    resolveFirst!();

    await Promise.all([promise1, promise2]);

    // Should only be called once
    expect(mutationFn).toHaveBeenCalledTimes(1);
    expect(mutationFn).toHaveBeenCalledWith("arg1", expect.any(Object));
  });

  it("should allow new execution after previous completes", async () => {
    const mutationFn = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useSafeMutation(mutationFn, {
        logContext: "testContext",
        errorMessage: TEST_ERROR,
      }),
    );

    await act(async () => {
      await result.current.execute("arg1");
    });

    await act(async () => {
      await result.current.execute("arg2");
    });

    expect(mutationFn).toHaveBeenCalledTimes(2);
    expect(mutationFn).toHaveBeenNthCalledWith(1, "arg1", expect.any(Object));
    expect(mutationFn).toHaveBeenNthCalledWith(2, "arg2", expect.any(Object));
  });

  describe("safe mode guard", () => {
    beforeEach(() => {
      vi.mocked(settingsStore.useSettingsStore).mockImplementation((selector) =>
        selector({ isSafeModeEnabled: true } as ReturnType<
          typeof settingsStore.useSettingsStore.getState
        >),
      );
    });

    it("should block execution when safe mode is enabled", async () => {
      const mutationFn = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useSafeMutation(mutationFn, {
          logContext: "testContext",
          errorMessage: TEST_ERROR,
          safeGuard: { context: "testContext", action: "test action" },
        }),
      );

      await act(async () => {
        const returnValue = await result.current.execute("arg");
        expect(returnValue).toBeUndefined();
      });

      expect(mutationFn).not.toHaveBeenCalled();
      expect(toast.warning).toHaveBeenCalledWith("settings.safeModeBlocked");
    });

    it("should allow execution without safeGuard option", async () => {
      const mutationFn = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useSafeMutation(mutationFn, {
          logContext: "testContext",
          errorMessage: TEST_ERROR,
          // No safeGuard option
        }),
      );

      await act(async () => {
        await result.current.execute("arg");
      });

      expect(mutationFn).toHaveBeenCalledWith("arg", expect.any(Object));
    });

    it("should allow execution in demo mode even with safe mode enabled", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ dataSource: "demo" } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      const mutationFn = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useSafeMutation(mutationFn, {
          logContext: "testContext",
          errorMessage: TEST_ERROR,
          safeGuard: { context: "testContext", action: "test action" },
        }),
      );

      await act(async () => {
        await result.current.execute("arg");
      });

      // Demo mode bypasses safe mode since changes are local-only
      expect(mutationFn).toHaveBeenCalledWith("arg", expect.any(Object));
    });
  });

  describe("skipSuccessToastInDemoMode", () => {
    it("should skip success toast in demo mode when configured", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ dataSource: "demo" } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      const mutationFn = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useSafeMutation(mutationFn, {
          logContext: "testContext",
          successMessage: TEST_SUCCESS,
          errorMessage: TEST_ERROR,
          skipSuccessToastInDemoMode: true,
        }),
      );

      await act(async () => {
        await result.current.execute("arg");
      });

      expect(toast.success).not.toHaveBeenCalled();
    });

    it("should show success toast in demo mode when not configured to skip", async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ dataSource: "demo" } as ReturnType<
          typeof authStore.useAuthStore.getState
        >),
      );

      const mutationFn = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useSafeMutation(mutationFn, {
          logContext: "testContext",
          successMessage: TEST_SUCCESS,
          errorMessage: TEST_ERROR,
          skipSuccessToastInDemoMode: false,
        }),
      );

      await act(async () => {
        await result.current.execute("arg");
      });

      expect(toast.success).toHaveBeenCalledWith(TEST_SUCCESS);
    });

    it("should show success toast when not in demo mode", async () => {
      const mutationFn = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useSafeMutation(mutationFn, {
          logContext: "testContext",
          successMessage: TEST_SUCCESS,
          errorMessage: TEST_ERROR,
          skipSuccessToastInDemoMode: true,
        }),
      );

      await act(async () => {
        await result.current.execute("arg");
      });

      expect(toast.success).toHaveBeenCalledWith(TEST_SUCCESS);
    });
  });

  it("should pass logger to mutation function", async () => {
    const mutationFn = vi.fn().mockImplementation((_arg, log) => {
      log.debug("Test log message");
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() =>
      useSafeMutation(mutationFn, {
        logContext: "testContext",
        errorMessage: TEST_ERROR,
      }),
    );

    await act(async () => {
      await result.current.execute("arg");
    });

    expect(mutationFn).toHaveBeenCalledWith("arg", expect.objectContaining({
      debug: expect.any(Function),
      error: expect.any(Function),
    }));
  });

  it("should reset executing flag after error", async () => {
    const mutationFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("First error"))
      .mockResolvedValueOnce("success");

    const { result } = renderHook(() =>
      useSafeMutation(mutationFn, {
        logContext: "testContext",
        errorMessage: TEST_ERROR,
      }),
    );

    // First call fails
    await act(async () => {
      await result.current.execute("arg1");
    });

    expect(mutationFn).toHaveBeenCalledTimes(1);

    // Second call should work (flag was reset)
    await act(async () => {
      const returnValue = await result.current.execute("arg2");
      expect(returnValue).toBe("success");
    });

    expect(mutationFn).toHaveBeenCalledTimes(2);
  });

  describe("isExecuting state", () => {
    it("should initially be false", () => {
      const mutationFn = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useSafeMutation(mutationFn, {
          logContext: "testContext",
          errorMessage: TEST_ERROR,
        }),
      );

      expect(result.current.isExecuting).toBe(false);
    });

    it("should be true during execution", async () => {
      let resolveExecution: () => void;
      const executionPromise = new Promise<void>((resolve) => {
        resolveExecution = resolve;
      });

      const mutationFn = vi.fn().mockReturnValue(executionPromise);

      const { result } = renderHook(() =>
        useSafeMutation(mutationFn, {
          logContext: "testContext",
          errorMessage: TEST_ERROR,
        }),
      );

      // Start execution without awaiting
      let executePromise: Promise<void | undefined>;
      act(() => {
        executePromise = result.current.execute("arg");
      });

      // Should be true during execution
      expect(result.current.isExecuting).toBe(true);

      // Resolve and wait for completion
      await act(async () => {
        resolveExecution!();
        await executePromise;
      });

      // Should be false after completion
      expect(result.current.isExecuting).toBe(false);
    });

    it("should be false after error", async () => {
      const mutationFn = vi.fn().mockRejectedValue(new Error("Test error"));

      const { result } = renderHook(() =>
        useSafeMutation(mutationFn, {
          logContext: "testContext",
          errorMessage: TEST_ERROR,
        }),
      );

      await act(async () => {
        await result.current.execute("arg");
      });

      expect(result.current.isExecuting).toBe(false);
    });
  });
});
