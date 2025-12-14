import { describe, it, expect } from "vitest";
import {
  classifyQueryError,
  isAuthError,
  isRetryableError,
  calculateRetryDelay,
  RETRY_CONFIG,
} from "./query-error-utils";

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const JITTER_FACTOR = 0.25;

describe("query-error-utils", () => {
  describe("classifyQueryError", () => {
    it("should classify network errors", () => {
      expect(classifyQueryError("Network error occurred")).toBe("network");
      expect(classifyQueryError("Failed to fetch resource")).toBe("network");
      expect(classifyQueryError("Request timeout")).toBe("network");
      expect(classifyQueryError("Connection refused")).toBe("network");
    });

    it("should classify auth errors", () => {
      expect(classifyQueryError("401 Unauthorized")).toBe("auth");
      expect(classifyQueryError("403 Forbidden")).toBe("auth");
      expect(classifyQueryError("406 Not Acceptable")).toBe("auth");
      expect(classifyQueryError("Unauthorized access")).toBe("auth");
      expect(classifyQueryError("Session expired")).toBe("auth");
    });

    it("should classify validation errors", () => {
      expect(classifyQueryError("Validation failed")).toBe("validation");
      expect(classifyQueryError("Invalid input data")).toBe("validation");
    });

    it("should classify rate limit errors", () => {
      expect(classifyQueryError("429 Too Many Requests")).toBe("rate_limit");
      expect(classifyQueryError("Too many requests")).toBe("rate_limit");
    });

    it("should classify unknown errors", () => {
      expect(classifyQueryError("Something went wrong")).toBe("unknown");
      expect(classifyQueryError("Internal server error")).toBe("unknown");
    });

    it("should be case-insensitive", () => {
      expect(classifyQueryError("NETWORK ERROR")).toBe("network");
      expect(classifyQueryError("Unauthorized")).toBe("auth");
      expect(classifyQueryError("VALIDATION FAILED")).toBe("validation");
    });

    it("should prioritize network errors over validation", () => {
      expect(classifyQueryError("Network timeout with invalid data")).toBe("network");
    });
  });

  describe("isAuthError", () => {
    it("should return true for auth errors", () => {
      const error = new Error("401 Unauthorized");
      expect(isAuthError(error)).toBe(true);
    });

    it("should return false for non-auth errors", () => {
      const error = new Error("Network error");
      expect(isAuthError(error)).toBe(false);
    });

    it("should return false for non-Error objects", () => {
      expect(isAuthError("string error")).toBe(false);
      expect(isAuthError(null)).toBe(false);
      expect(isAuthError(undefined)).toBe(false);
      expect(isAuthError({ message: "401" })).toBe(false);
    });
  });

  describe("isRetryableError", () => {
    it("should return true for network errors", () => {
      const error = new Error("Failed to fetch");
      expect(isRetryableError(error)).toBe(true);
    });

    it("should return true for rate limit errors", () => {
      const error = new Error("429 Too Many Requests");
      expect(isRetryableError(error)).toBe(true);
    });

    it("should return false for auth errors", () => {
      const error = new Error("401 Unauthorized");
      expect(isRetryableError(error)).toBe(false);
    });

    it("should return false for validation errors", () => {
      const error = new Error("Validation failed");
      expect(isRetryableError(error)).toBe(false);
    });

    it("should return false for unknown errors", () => {
      const error = new Error("Something went wrong");
      expect(isRetryableError(error)).toBe(false);
    });

    it("should return false for non-Error objects", () => {
      expect(isRetryableError("string error")).toBe(false);
      expect(isRetryableError(null)).toBe(false);
      expect(isRetryableError(undefined)).toBe(false);
    });
  });

  describe("calculateRetryDelay", () => {
    it("should calculate exponential backoff", () => {
      const firstRetry = calculateRetryDelay(0);
      const secondRetry = calculateRetryDelay(1);
      const thirdRetry = calculateRetryDelay(2);

      expect(firstRetry).toBeGreaterThanOrEqual(BASE_DELAY_MS);
      expect(firstRetry).toBeLessThanOrEqual(BASE_DELAY_MS * (1 + JITTER_FACTOR));

      expect(secondRetry).toBeGreaterThanOrEqual(BASE_DELAY_MS * 2);
      expect(secondRetry).toBeLessThanOrEqual(BASE_DELAY_MS * 2 * (1 + JITTER_FACTOR));

      expect(thirdRetry).toBeGreaterThanOrEqual(BASE_DELAY_MS * 4);
      expect(thirdRetry).toBeLessThanOrEqual(BASE_DELAY_MS * 4 * (1 + JITTER_FACTOR));
    });

    it("should include jitter to prevent thundering herd", () => {
      const delays = Array.from({ length: 10 }, () => calculateRetryDelay(0));
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });

    it("should respect max delay cap", () => {
      const highAttempt = 10;
      const delay = calculateRetryDelay(highAttempt);
      expect(delay).toBeLessThanOrEqual(MAX_DELAY_MS);
    });

    it("should accept optional error parameter for TanStack Query compatibility", () => {
      const error = new Error("test");
      const delayWithError = calculateRetryDelay(0, error);
      const delayWithoutError = calculateRetryDelay(0);

      expect(delayWithError).toBeGreaterThanOrEqual(BASE_DELAY_MS);
      expect(delayWithoutError).toBeGreaterThanOrEqual(BASE_DELAY_MS);
    });

    it("should use real randomness for jitter", () => {
      const delays = Array.from({ length: 100 }, () => calculateRetryDelay(0));
      const min = Math.min(...delays);
      const max = Math.max(...delays);

      expect(min).toBeGreaterThanOrEqual(BASE_DELAY_MS);
      expect(max).toBeLessThanOrEqual(BASE_DELAY_MS * (1 + JITTER_FACTOR));
      expect(max - min).toBeGreaterThan(0);
    });
  });

  describe("RETRY_CONFIG.MAX_QUERY_RETRIES", () => {
    it("should be defined as 3", () => {
      expect(RETRY_CONFIG.MAX_QUERY_RETRIES).toBe(3);
    });

    it("should be a number constant", () => {
      expect(typeof RETRY_CONFIG.MAX_QUERY_RETRIES).toBe("number");
    });
  });
});
