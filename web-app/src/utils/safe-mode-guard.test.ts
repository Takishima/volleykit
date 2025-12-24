import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkSafeMode } from "./safe-mode-guard";
import { toast } from "@/stores/toast";

const mockLogDebug = vi.fn();

vi.mock("@/utils/logger", () => ({
  createLogger: () => ({
    debug: (...args: unknown[]) => mockLogDebug(...args),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("@/stores/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/i18n", () => ({
  t: (key: string) => key,
}));

describe("checkSafeMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("demo mode bypass", () => {
    it("should return false when in demo mode, even if safe mode is enabled", () => {
      const result = checkSafeMode({
        isDemoMode: true,
        isSafeModeEnabled: true,
        context: "test",
        action: "operation",
      });

      expect(result).toBe(false);
      expect(mockLogDebug).not.toHaveBeenCalled();
      expect(toast.warning).not.toHaveBeenCalled();
    });

    it("should return false when in demo mode and safe mode is disabled", () => {
      const result = checkSafeMode({
        isDemoMode: true,
        isSafeModeEnabled: false,
        context: "test",
        action: "operation",
      });

      expect(result).toBe(false);
      expect(mockLogDebug).not.toHaveBeenCalled();
      expect(toast.warning).not.toHaveBeenCalled();
    });
  });

  describe("safe mode disabled", () => {
    it("should return false when safe mode is disabled (not in demo mode)", () => {
      const result = checkSafeMode({
        isDemoMode: false,
        isSafeModeEnabled: false,
        context: "test",
        action: "operation",
      });

      expect(result).toBe(false);
      expect(mockLogDebug).not.toHaveBeenCalled();
      expect(toast.warning).not.toHaveBeenCalled();
    });
  });

  describe("active blocking", () => {
    it("should return true and show warning when safe mode is active and not in demo mode", () => {
      const result = checkSafeMode({
        isDemoMode: false,
        isSafeModeEnabled: true,
        context: "useAssignmentActions",
        action: "game validation",
      });

      expect(result).toBe(true);
      expect(mockLogDebug).toHaveBeenCalledWith(
        "[useAssignmentActions] game validation blocked by safe mode",
      );
      expect(toast.warning).toHaveBeenCalledWith("settings.safeModeBlocked");
    });

    it("should use provided context and action in log message", () => {
      checkSafeMode({
        isDemoMode: false,
        isSafeModeEnabled: true,
        context: "useExchangeActions",
        action: "take over",
      });

      expect(mockLogDebug).toHaveBeenCalledWith(
        "[useExchangeActions] take over blocked by safe mode",
      );
    });
  });

  describe("logging behavior", () => {
    it("should log with correct format when blocking operation", () => {
      checkSafeMode({
        isDemoMode: false,
        isSafeModeEnabled: true,
        context: "custom",
        action: "my action",
      });

      expect(mockLogDebug).toHaveBeenCalledTimes(1);
      expect(mockLogDebug).toHaveBeenCalledWith(
        "[custom] my action blocked by safe mode",
      );
    });

    it("should not log when operation is allowed", () => {
      checkSafeMode({
        isDemoMode: false,
        isSafeModeEnabled: false,
        context: "test",
        action: "allowed operation",
      });

      expect(mockLogDebug).not.toHaveBeenCalled();
    });
  });

  describe("toast behavior", () => {
    it("should show warning toast with translation key when blocking", () => {
      checkSafeMode({
        isDemoMode: false,
        isSafeModeEnabled: true,
        context: "test",
        action: "blocked",
      });

      expect(toast.warning).toHaveBeenCalledTimes(1);
      expect(toast.warning).toHaveBeenCalledWith("settings.safeModeBlocked");
    });

    it("should not show toast when operation is allowed", () => {
      checkSafeMode({
        isDemoMode: true,
        isSafeModeEnabled: true,
        context: "test",
        action: "allowed",
      });

      expect(toast.warning).not.toHaveBeenCalled();
    });
  });

  describe("return value semantics", () => {
    it("should return true to indicate operation should be blocked", () => {
      const result = checkSafeMode({
        isDemoMode: false,
        isSafeModeEnabled: true,
        context: "test",
        action: "blocked",
      });

      expect(result).toBe(true);
    });

    it("should return false to indicate operation can proceed", () => {
      const result = checkSafeMode({
        isDemoMode: false,
        isSafeModeEnabled: false,
        context: "test",
        action: "allowed",
      });

      expect(result).toBe(false);
    });
  });
});
