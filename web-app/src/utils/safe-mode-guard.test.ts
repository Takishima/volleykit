import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkSafeMode } from "./safe-mode-guard";
import { logger } from "@/utils/logger";
import { toast } from "@/stores/toast";

vi.mock("@/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
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
        context: "[test] operation",
      });

      expect(result).toBe(false);
      expect(logger.debug).not.toHaveBeenCalled();
      expect(toast.warning).not.toHaveBeenCalled();
    });

    it("should return false when in demo mode and safe mode is disabled", () => {
      const result = checkSafeMode({
        isDemoMode: true,
        isSafeModeEnabled: false,
        context: "[test] operation",
      });

      expect(result).toBe(false);
      expect(logger.debug).not.toHaveBeenCalled();
      expect(toast.warning).not.toHaveBeenCalled();
    });
  });

  describe("safe mode disabled", () => {
    it("should return false when safe mode is disabled (not in demo mode)", () => {
      const result = checkSafeMode({
        isDemoMode: false,
        isSafeModeEnabled: false,
        context: "[test] operation",
      });

      expect(result).toBe(false);
      expect(logger.debug).not.toHaveBeenCalled();
      expect(toast.warning).not.toHaveBeenCalled();
    });
  });

  describe("active blocking", () => {
    it("should return true and show warning when safe mode is active and not in demo mode", () => {
      const result = checkSafeMode({
        isDemoMode: false,
        isSafeModeEnabled: true,
        context: "[useAssignmentActions] game validation",
      });

      expect(result).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith(
        "[useAssignmentActions] game validation blocked by safe mode",
      );
      expect(toast.warning).toHaveBeenCalledWith("settings.safeModeBlocked");
    });

    it("should use provided context in log message", () => {
      checkSafeMode({
        isDemoMode: false,
        isSafeModeEnabled: true,
        context: "[useExchangeActions] take over",
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "[useExchangeActions] take over blocked by safe mode",
      );
    });
  });

  describe("logging behavior", () => {
    it("should log with correct format when blocking operation", () => {
      checkSafeMode({
        isDemoMode: false,
        isSafeModeEnabled: true,
        context: "[custom] my action",
      });

      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        "[custom] my action blocked by safe mode",
      );
    });

    it("should not log when operation is allowed", () => {
      checkSafeMode({
        isDemoMode: false,
        isSafeModeEnabled: false,
        context: "[test] allowed operation",
      });

      expect(logger.debug).not.toHaveBeenCalled();
    });
  });

  describe("toast behavior", () => {
    it("should show warning toast with translation key when blocking", () => {
      checkSafeMode({
        isDemoMode: false,
        isSafeModeEnabled: true,
        context: "[test] blocked",
      });

      expect(toast.warning).toHaveBeenCalledTimes(1);
      expect(toast.warning).toHaveBeenCalledWith("settings.safeModeBlocked");
    });

    it("should not show toast when operation is allowed", () => {
      checkSafeMode({
        isDemoMode: true,
        isSafeModeEnabled: true,
        context: "[test] allowed",
      });

      expect(toast.warning).not.toHaveBeenCalled();
    });
  });

  describe("return value semantics", () => {
    it("should return true to indicate operation should be blocked", () => {
      const result = checkSafeMode({
        isDemoMode: false,
        isSafeModeEnabled: true,
        context: "[test]",
      });

      expect(result).toBe(true);
    });

    it("should return false to indicate operation can proceed", () => {
      const result = checkSafeMode({
        isDemoMode: false,
        isSafeModeEnabled: false,
        context: "[test]",
      });

      expect(result).toBe(false);
    });
  });
});
