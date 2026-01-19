/**
 * Tests for error helper utilities
 */

import { describe, it, expect } from "vitest";
import {
  classifyError,
  isNetworkError,
  getErrorMessage,
  createAppError,
  isError,
  ensureError,
  type AppError,
  type ErrorType,
} from "./error-helpers";

describe("classifyError", () => {
  it("should classify TypeError with fetch message as network error", () => {
    const error = new TypeError("Failed to fetch");
    expect(classifyError(error)).toBe("network");
  });

  it("should classify NetworkError by name as network error", () => {
    const error = new Error("Something went wrong");
    error.name = "NetworkError";
    expect(classifyError(error)).toBe("network");
  });

  it('should classify error with "network" in message as network error', () => {
    const error = new Error("Network request failed");
    expect(classifyError(error)).toBe("network");
  });

  it('should classify error with "failed to fetch" in message as network error', () => {
    const error = new Error("Failed to fetch data from server");
    expect(classifyError(error)).toBe("network");
  });

  it('should classify error with "connection" in message as network error', () => {
    const error = new Error("Connection refused");
    expect(classifyError(error)).toBe("network");
  });

  it('should classify error with "timeout" in message as network error', () => {
    const error = new Error("Request timeout");
    expect(classifyError(error)).toBe("network");
  });

  it('should classify error with "cors" in message as network error', () => {
    const error = new Error("CORS policy blocked");
    expect(classifyError(error)).toBe("network");
  });

  it('should classify error with "offline" in message as network error', () => {
    const error = new Error("Device is offline");
    expect(classifyError(error)).toBe("network");
  });

  it("should classify regular Error as application error", () => {
    const error = new Error("Something went wrong");
    expect(classifyError(error)).toBe("application");
  });

  it("should classify SyntaxError as application error", () => {
    const error = new SyntaxError("Unexpected token");
    expect(classifyError(error)).toBe("application");
  });

  it("should classify ReferenceError as application error", () => {
    const error = new ReferenceError("x is not defined");
    expect(classifyError(error)).toBe("application");
  });

  it("should be case-insensitive for message matching", () => {
    const error = new Error("NETWORK ERROR");
    expect(classifyError(error)).toBe("network");
  });

  it("should be case-insensitive for name matching", () => {
    const error = new Error("Something failed");
    error.name = "NETWORKERROR";
    expect(classifyError(error)).toBe("network");
  });
});

describe("isNetworkError", () => {
  it("should return true for network-related Error", () => {
    const error = new Error("Network request failed");
    expect(isNetworkError(error)).toBe(true);
  });

  it("should return true for TypeError with fetch", () => {
    const error = new TypeError("Failed to fetch");
    expect(isNetworkError(error)).toBe(true);
  });

  it("should return false for application Error", () => {
    const error = new Error("Application error");
    expect(isNetworkError(error)).toBe(false);
  });

  it("should return false for null", () => {
    expect(isNetworkError(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isNetworkError(undefined)).toBe(false);
  });

  it("should return false for string", () => {
    expect(isNetworkError("error message")).toBe(false);
  });

  it("should return false for number", () => {
    expect(isNetworkError(500)).toBe(false);
  });

  it("should return false for plain object", () => {
    expect(isNetworkError({ message: "error" })).toBe(false);
  });
});

describe("getErrorMessage", () => {
  it("should extract message from Error instance", () => {
    const error = new Error("Test error message");
    expect(getErrorMessage(error)).toBe("Test error message");
  });

  it("should extract message from TypeError", () => {
    const error = new TypeError("Type error occurred");
    expect(getErrorMessage(error)).toBe("Type error occurred");
  });

  it("should return string as-is", () => {
    expect(getErrorMessage("String error")).toBe("String error");
  });

  it("should return empty string as-is", () => {
    expect(getErrorMessage("")).toBe("");
  });

  it("should return default message for null", () => {
    expect(getErrorMessage(null)).toBe("An unknown error occurred");
  });

  it("should return default message for undefined", () => {
    expect(getErrorMessage(undefined)).toBe("An unknown error occurred");
  });

  it("should return default message for number", () => {
    expect(getErrorMessage(500)).toBe("An unknown error occurred");
  });

  it("should return default message for object", () => {
    expect(getErrorMessage({ code: "ERR_01" })).toBe(
      "An unknown error occurred"
    );
  });

  it("should return default message for array", () => {
    expect(getErrorMessage(["error1", "error2"])).toBe(
      "An unknown error occurred"
    );
  });
});

describe("createAppError", () => {
  it("should create AppError with message only", () => {
    const error = createAppError("Something went wrong");
    expect(error).toEqual({
      message: "Something went wrong",
      code: undefined,
      status: undefined,
    });
  });

  it("should create AppError with message and code", () => {
    const error = createAppError("Validation failed", "VALIDATION_ERROR");
    expect(error).toEqual({
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      status: undefined,
    });
  });

  it("should create AppError with message, code, and status", () => {
    const error = createAppError("Not found", "NOT_FOUND", 404);
    expect(error).toEqual({
      message: "Not found",
      code: "NOT_FOUND",
      status: 404,
    });
  });

  it("should create AppError with message and status (no code)", () => {
    const error = createAppError("Server error", undefined, 500);
    expect(error).toEqual({
      message: "Server error",
      code: undefined,
      status: 500,
    });
  });

  it("should create AppError with empty message", () => {
    const error = createAppError("");
    expect(error.message).toBe("");
  });

  it("should return object conforming to AppError interface", () => {
    const error: AppError = createAppError("Test", "CODE", 400);
    expect(error.message).toBe("Test");
    expect(error.code).toBe("CODE");
    expect(error.status).toBe(400);
  });
});

describe("isError", () => {
  it("should return true for Error instance", () => {
    expect(isError(new Error("test"))).toBe(true);
  });

  it("should return true for TypeError", () => {
    expect(isError(new TypeError("test"))).toBe(true);
  });

  it("should return true for SyntaxError", () => {
    expect(isError(new SyntaxError("test"))).toBe(true);
  });

  it("should return true for ReferenceError", () => {
    expect(isError(new ReferenceError("test"))).toBe(true);
  });

  it("should return true for RangeError", () => {
    expect(isError(new RangeError("test"))).toBe(true);
  });

  it("should return false for null", () => {
    expect(isError(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isError(undefined)).toBe(false);
  });

  it("should return false for string", () => {
    expect(isError("error message")).toBe(false);
  });

  it("should return false for number", () => {
    expect(isError(404)).toBe(false);
  });

  it("should return false for plain object with message property", () => {
    expect(isError({ message: "error", name: "Error" })).toBe(false);
  });

  it("should return false for array", () => {
    expect(isError([])).toBe(false);
  });

  it("should work as type guard", () => {
    const value: unknown = new Error("test");
    if (isError(value)) {
      // TypeScript should narrow type to Error
      expect(value.message).toBe("test");
    }
  });
});

describe("ensureError", () => {
  it("should return Error instance as-is", () => {
    const error = new Error("Original error");
    const result = ensureError(error);
    expect(result).toBe(error);
    expect(result.message).toBe("Original error");
  });

  it("should return TypeError as-is", () => {
    const error = new TypeError("Type error");
    const result = ensureError(error);
    expect(result).toBe(error);
    expect(result).toBeInstanceOf(TypeError);
  });

  it("should wrap string in Error", () => {
    const result = ensureError("String error message");
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("String error message");
  });

  it("should wrap empty string in Error", () => {
    const result = ensureError("");
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("");
  });

  it("should wrap null with default message", () => {
    const result = ensureError(null);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("An unknown error occurred");
  });

  it("should wrap undefined with default message", () => {
    const result = ensureError(undefined);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("An unknown error occurred");
  });

  it("should wrap number with default message", () => {
    const result = ensureError(500);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("An unknown error occurred");
  });

  it("should wrap object with default message", () => {
    const result = ensureError({ code: "ERR_001" });
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("An unknown error occurred");
  });

  it("should always return Error type", () => {
    const values: unknown[] = [
      new Error("test"),
      "string",
      null,
      undefined,
      42,
      {},
      [],
    ];

    for (const value of values) {
      const result = ensureError(value);
      expect(result).toBeInstanceOf(Error);
    }
  });
});

describe("ErrorType", () => {
  it("should be a union of network and application", () => {
    const network: ErrorType = "network";
    const application: ErrorType = "application";
    expect(network).toBe("network");
    expect(application).toBe("application");
  });
});
