import { describe, it, expect } from "vitest";
import {
  classifyQueryError,
  isAuthError,
  isRetryableError,
  calculateRetryDelay,
  MAX_QUERY_RETRIES,
} from "./query-error-utils";

describe("classifyQueryError", () => {
  it("classifies network errors", () => {
    expect(classifyQueryError("Network error occurred")).toBe("network");
    expect(classifyQueryError("Failed to fetch")).toBe("network");
    expect(classifyQueryError("Request timeout")).toBe("network");
    expect(classifyQueryError("Connection refused")).toBe("network");
  });

  it("classifies auth errors", () => {
    expect(classifyQueryError("401 Unauthorized")).toBe("auth");
    expect(classifyQueryError("403 Forbidden")).toBe("auth");
    expect(classifyQueryError("406 Not Acceptable")).toBe("auth");
    expect(classifyQueryError("Session expired")).toBe("auth");
    expect(classifyQueryError("Unauthorized access")).toBe("auth");
  });

  it("classifies validation errors", () => {
    expect(classifyQueryError("Validation failed")).toBe("validation");
    expect(classifyQueryError("Invalid input")).toBe("validation");
  });

  it("classifies rate limit errors", () => {
    expect(classifyQueryError("429 Too Many Requests")).toBe("rate_limit");
    expect(classifyQueryError("Too many requests")).toBe("rate_limit");
  });

  it("classifies unknown errors", () => {
    expect(classifyQueryError("Something went wrong")).toBe("unknown");
    expect(classifyQueryError("500 Internal Server Error")).toBe("unknown");
  });

  it("handles case-insensitive matching", () => {
    expect(classifyQueryError("NETWORK ERROR")).toBe("network");
    expect(classifyQueryError("Unauthorized")).toBe("auth");
    expect(classifyQueryError("VALIDATION ERROR")).toBe("validation");
  });

  it("prioritizes network over other classifications", () => {
    expect(classifyQueryError("Network error 401")).toBe("network");
  });
});

describe("isAuthError", () => {
  it("returns true for auth errors", () => {
    expect(isAuthError(new Error("401 Unauthorized"))).toBe(true);
    expect(isAuthError(new Error("Session expired"))).toBe(true);
    expect(isAuthError(new Error("403 Forbidden"))).toBe(true);
  });

  it("returns false for non-auth errors", () => {
    expect(isAuthError(new Error("Network error"))).toBe(false);
    expect(isAuthError(new Error("Validation failed"))).toBe(false);
    expect(isAuthError(new Error("Unknown error"))).toBe(false);
  });

  it("returns false for non-Error objects", () => {
    expect(isAuthError("string error")).toBe(false);
    expect(isAuthError(null)).toBe(false);
    expect(isAuthError(undefined)).toBe(false);
    expect(isAuthError({ message: "401" })).toBe(false);
  });
});

describe("isRetryableError", () => {
  it("returns true for network errors", () => {
    expect(isRetryableError(new Error("Network error"))).toBe(true);
    expect(isRetryableError(new Error("Failed to fetch"))).toBe(true);
    expect(isRetryableError(new Error("Connection timeout"))).toBe(true);
  });

  it("returns true for rate limit errors", () => {
    expect(isRetryableError(new Error("429 Too Many Requests"))).toBe(true);
    expect(isRetryableError(new Error("Too many requests"))).toBe(true);
  });

  it("returns false for auth errors", () => {
    expect(isRetryableError(new Error("401 Unauthorized"))).toBe(false);
    expect(isRetryableError(new Error("Session expired"))).toBe(false);
  });

  it("returns false for validation errors", () => {
    expect(isRetryableError(new Error("Validation failed"))).toBe(false);
    expect(isRetryableError(new Error("Invalid input"))).toBe(false);
  });

  it("returns false for unknown errors", () => {
    expect(isRetryableError(new Error("Something went wrong"))).toBe(false);
  });

  it("returns false for non-Error objects", () => {
    expect(isRetryableError("string error")).toBe(false);
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
  });
});

describe("calculateRetryDelay", () => {
  const BASE_DELAY_MS = 1000;
  const MAX_DELAY_MS = 30000;
  const JITTER_FACTOR = 0.25;

  it("returns exponential backoff for retry attempts", () => {
    const firstRetryDelay = calculateRetryDelay(0);
    const secondRetryDelay = calculateRetryDelay(1);
    const thirdRetryDelay = calculateRetryDelay(2);

    expect(firstRetryDelay).toBeGreaterThanOrEqual(BASE_DELAY_MS);
    expect(firstRetryDelay).toBeLessThan(
      BASE_DELAY_MS * Math.pow(2, 0) * (1 + JITTER_FACTOR) + 1,
    );

    expect(secondRetryDelay).toBeGreaterThanOrEqual(BASE_DELAY_MS * 2);
    expect(secondRetryDelay).toBeLessThan(
      BASE_DELAY_MS * Math.pow(2, 1) * (1 + JITTER_FACTOR) + 1,
    );

    expect(thirdRetryDelay).toBeGreaterThanOrEqual(BASE_DELAY_MS * 4);
    expect(thirdRetryDelay).toBeLessThan(
      BASE_DELAY_MS * Math.pow(2, 2) * (1 + JITTER_FACTOR) + 1,
    );
  });

  it("respects maximum delay cap", () => {
    const veryHighRetryAttempt = 10;
    const delay = calculateRetryDelay(veryHighRetryAttempt);
    expect(delay).toBeLessThanOrEqual(MAX_DELAY_MS);
  });

  it("includes jitter within expected range", () => {
    const attemptIndex = 0;
    const delays = Array.from({ length: 100 }, () =>
      calculateRetryDelay(attemptIndex),
    );

    const minExpected = BASE_DELAY_MS;
    const maxExpected = BASE_DELAY_MS * (1 + JITTER_FACTOR);

    delays.forEach((delay) => {
      expect(delay).toBeGreaterThanOrEqual(minExpected);
      expect(delay).toBeLessThanOrEqual(maxExpected + 1);
    });

    const uniqueDelays = new Set(delays);
    expect(uniqueDelays.size).toBeGreaterThan(1);
  });

  it("accepts optional error parameter for TanStack Query compatibility", () => {
    const error = new Error("Test error");
    expect(() => calculateRetryDelay(0, error)).not.toThrow();
    expect(calculateRetryDelay(0, error)).toBeGreaterThanOrEqual(BASE_DELAY_MS);
  });

  it("produces different delays due to randomness", () => {
    const delays = Array.from({ length: 10 }, () => calculateRetryDelay(0));
    const uniqueDelays = new Set(delays);
    expect(uniqueDelays.size).toBeGreaterThan(1);
  });
});

describe("MAX_QUERY_RETRIES", () => {
  it("exports constant with expected value", () => {
    expect(MAX_QUERY_RETRIES).toBe(3);
  });

  it("is a number type", () => {
    expect(typeof MAX_QUERY_RETRIES).toBe("number");
  });
});
