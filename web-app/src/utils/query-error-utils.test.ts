import { describe, it, expect } from "vitest";
import {
  classifyQueryError,
  isAuthError,
  isRetryableError,
  calculateRetryDelay,
  MAX_QUERY_RETRIES,
} from "./query-error-utils";

describe("query-error-utils", () => {
  describe("classifyQueryError", () => {
    it("classifies network errors", () => {
      expect(classifyQueryError("Failed to fetch")).toBe("network");
      expect(classifyQueryError("Network timeout")).toBe("network");
      expect(classifyQueryError("Connection failed")).toBe("network");
    });

    it("classifies auth errors with status codes", () => {
      expect(classifyQueryError("401 Unauthorized")).toBe("auth");
      expect(classifyQueryError("403 Forbidden")).toBe("auth");
      expect(classifyQueryError("406 Not Acceptable")).toBe("auth");
    });

    it("classifies auth errors with session expired message", () => {
      expect(classifyQueryError("Session expired. Please log in again.")).toBe(
        "auth",
      );
    });

    it("classifies validation errors", () => {
      expect(classifyQueryError("Validation failed")).toBe("validation");
      expect(classifyQueryError("Invalid input")).toBe("validation");
    });

    it("classifies rate limit errors", () => {
      expect(classifyQueryError("429 Too Many Requests")).toBe("rate_limit");
      expect(classifyQueryError("Error: Too many requests")).toBe("rate_limit");
    });

    it("returns unknown for unrecognized errors", () => {
      expect(classifyQueryError("Something went wrong")).toBe("unknown");
      expect(classifyQueryError("500 Internal Server Error")).toBe("unknown");
    });

    it("is case-insensitive", () => {
      expect(classifyQueryError("NETWORK ERROR")).toBe("network");
      expect(classifyQueryError("SESSION EXPIRED")).toBe("auth");
      expect(classifyQueryError("TOO MANY REQUESTS")).toBe("rate_limit");
    });
  });

  describe("isAuthError", () => {
    it("returns true for auth errors", () => {
      expect(isAuthError(new Error("401 Unauthorized"))).toBe(true);
      expect(isAuthError(new Error("403 Forbidden"))).toBe(true);
      expect(isAuthError(new Error("406 Not Acceptable"))).toBe(true);
      expect(
        isAuthError(new Error("Session expired. Please log in again.")),
      ).toBe(true);
    });

    it("returns false for non-auth errors", () => {
      expect(isAuthError(new Error("Network error"))).toBe(false);
      expect(isAuthError(new Error("500 Server Error"))).toBe(false);
    });

    it("returns false for non-Error objects", () => {
      expect(isAuthError("string error")).toBe(false);
      expect(isAuthError(null)).toBe(false);
      expect(isAuthError(undefined)).toBe(false);
    });
  });

  describe("isRetryableError", () => {
    it("returns true for network errors", () => {
      expect(isRetryableError(new Error("Failed to fetch"))).toBe(true);
      expect(isRetryableError(new Error("Network timeout"))).toBe(true);
      expect(isRetryableError(new Error("Connection failed"))).toBe(true);
    });

    it("returns true for rate limit errors", () => {
      expect(isRetryableError(new Error("429 Too Many Requests"))).toBe(true);
      expect(isRetryableError(new Error("Too many requests"))).toBe(true);
    });

    it("returns false for auth errors", () => {
      expect(isRetryableError(new Error("401 Unauthorized"))).toBe(false);
      expect(isRetryableError(new Error("403 Forbidden"))).toBe(false);
      expect(isRetryableError(new Error("Session expired"))).toBe(false);
    });

    it("returns false for validation errors", () => {
      expect(isRetryableError(new Error("Validation failed"))).toBe(false);
      expect(isRetryableError(new Error("Invalid input"))).toBe(false);
    });

    it("returns false for unknown errors", () => {
      expect(isRetryableError(new Error("Something went wrong"))).toBe(false);
      expect(isRetryableError(new Error("500 Internal Server Error"))).toBe(
        false,
      );
    });

    it("returns false for non-Error objects", () => {
      expect(isRetryableError("string error")).toBe(false);
      expect(isRetryableError(null)).toBe(false);
      expect(isRetryableError(undefined)).toBe(false);
      expect(isRetryableError({ message: "error" })).toBe(false);
    });
  });

  describe("calculateRetryDelay", () => {
    it("uses exponential backoff with base delay of 1000ms", () => {
      const originalRandom = Math.random;
      Math.random = () => 0;

      try {
        expect(calculateRetryDelay(0)).toBe(1000);
        expect(calculateRetryDelay(1)).toBe(2000);
        expect(calculateRetryDelay(2)).toBe(4000);
        expect(calculateRetryDelay(3)).toBe(8000);
      } finally {
        Math.random = originalRandom;
      }
    });

    it("adds jitter to prevent thundering herd", () => {
      const originalRandom = Math.random;
      Math.random = () => 1;

      try {
        expect(calculateRetryDelay(0)).toBe(1250);
        expect(calculateRetryDelay(1)).toBe(2500);
      } finally {
        Math.random = originalRandom;
      }
    });

    it("caps delay at 30 seconds", () => {
      const originalRandom = Math.random;
      Math.random = () => 0;

      try {
        expect(calculateRetryDelay(5)).toBe(30000);
        expect(calculateRetryDelay(10)).toBe(30000);
      } finally {
        Math.random = originalRandom;
      }
    });

    it("accepts optional error parameter for TanStack Query compatibility", () => {
      const originalRandom = Math.random;
      Math.random = () => 0;

      try {
        expect(calculateRetryDelay(0)).toBe(1000);
        expect(calculateRetryDelay(0, new Error("test"))).toBe(1000);
        expect(calculateRetryDelay(1, undefined)).toBe(2000);
      } finally {
        Math.random = originalRandom;
      }
    });

    it("returns values within expected range with real randomness", () => {
      for (let i = 0; i < 100; i++) {
        const delay0 = calculateRetryDelay(0);
        expect(delay0).toBeGreaterThanOrEqual(1000);
        expect(delay0).toBeLessThanOrEqual(1250);

        const delay1 = calculateRetryDelay(1);
        expect(delay1).toBeGreaterThanOrEqual(2000);
        expect(delay1).toBeLessThanOrEqual(2500);
      }
    });
  });

  describe("MAX_QUERY_RETRIES", () => {
    it("is exported and has expected value", () => {
      expect(MAX_QUERY_RETRIES).toBe(3);
    });

    it("is a number", () => {
      expect(typeof MAX_QUERY_RETRIES).toBe("number");
    });
  });
});
