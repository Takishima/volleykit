import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { badgeService, badgeOperations } from "./badge-service";

describe("badgeService", () => {
  const mockSetAppBadge = vi.fn().mockResolvedValue(undefined);
  const mockClearAppBadge = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    // Reset mocks and cache before each test
    vi.clearAllMocks();
    badgeOperations.resetCache();
  });

  afterEach(() => {
    // Clean up navigator mocks
    if ("setAppBadge" in navigator) {
      // @ts-expect-error - cleaning up test mock
      delete navigator.setAppBadge;
    }
    if ("clearAppBadge" in navigator) {
      // @ts-expect-error - cleaning up test mock
      delete navigator.clearAppBadge;
    }
  });

  describe("isSupported", () => {
    it("returns false when Badging API is not available", () => {
      expect(badgeService.isSupported()).toBe(false);
    });

    it("returns true when setAppBadge is available", () => {
      Object.defineProperty(navigator, "setAppBadge", {
        value: mockSetAppBadge,
        configurable: true,
      });

      expect(badgeService.isSupported()).toBe(true);
    });
  });

  describe("setBadge", () => {
    it("returns error when API is not supported", async () => {
      const result = await badgeService.setBadge(5);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not supported");
    });

    it("calls setAppBadge with the count when supported", async () => {
      Object.defineProperty(navigator, "setAppBadge", {
        value: mockSetAppBadge,
        configurable: true,
      });
      Object.defineProperty(navigator, "clearAppBadge", {
        value: mockClearAppBadge,
        configurable: true,
      });

      const result = await badgeService.setBadge(5);

      expect(result.success).toBe(true);
      expect(mockSetAppBadge).toHaveBeenCalledWith(5);
    });

    it("calls clearAppBadge when count is 0", async () => {
      Object.defineProperty(navigator, "setAppBadge", {
        value: mockSetAppBadge,
        configurable: true,
      });
      Object.defineProperty(navigator, "clearAppBadge", {
        value: mockClearAppBadge,
        configurable: true,
      });

      const result = await badgeService.setBadge(0);

      expect(result.success).toBe(true);
      expect(mockClearAppBadge).toHaveBeenCalled();
      expect(mockSetAppBadge).not.toHaveBeenCalled();
    });

    it("handles API errors gracefully", async () => {
      const error = new Error("Permission denied");
      Object.defineProperty(navigator, "setAppBadge", {
        value: vi.fn().mockRejectedValue(error),
        configurable: true,
      });

      const result = await badgeService.setBadge(5);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Permission denied");
    });
  });

  describe("clearBadge", () => {
    it("clears the badge by setting count to 0", async () => {
      Object.defineProperty(navigator, "setAppBadge", {
        value: mockSetAppBadge,
        configurable: true,
      });
      Object.defineProperty(navigator, "clearAppBadge", {
        value: mockClearAppBadge,
        configurable: true,
      });

      const result = await badgeService.clearBadge();

      expect(result.success).toBe(true);
      expect(mockClearAppBadge).toHaveBeenCalled();
    });
  });

  describe("badgeOperations", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "setAppBadge", {
        value: mockSetAppBadge,
        configurable: true,
      });
      Object.defineProperty(navigator, "clearAppBadge", {
        value: mockClearAppBadge,
        configurable: true,
      });
    });

    it("setBadgeWithOptions skips update when skipIfUnchanged is true and count matches", async () => {
      // First call sets the badge
      await badgeOperations.setBadgeWithOptions(5);
      expect(mockSetAppBadge).toHaveBeenCalledTimes(1);

      // Second call with same count and skipIfUnchanged should skip
      await badgeOperations.setBadgeWithOptions(5, { skipIfUnchanged: true });
      expect(mockSetAppBadge).toHaveBeenCalledTimes(1); // Still 1

      // Third call with different count should update
      await badgeOperations.setBadgeWithOptions(10, { skipIfUnchanged: true });
      expect(mockSetAppBadge).toHaveBeenCalledTimes(2);
    });

    it("getLastBadgeCount returns the last set count", async () => {
      expect(badgeOperations.getLastBadgeCount()).toBeNull();

      await badgeService.setBadge(3);
      expect(badgeOperations.getLastBadgeCount()).toBe(3);

      await badgeService.setBadge(7);
      expect(badgeOperations.getLastBadgeCount()).toBe(7);
    });

    it("resetCache clears the last badge count", async () => {
      await badgeService.setBadge(5);
      expect(badgeOperations.getLastBadgeCount()).toBe(5);

      badgeOperations.resetCache();
      expect(badgeOperations.getLastBadgeCount()).toBeNull();
    });
  });
});
