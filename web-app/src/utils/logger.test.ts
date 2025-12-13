import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should have debug method", () => {
    expect(typeof logger.debug).toBe("function");
    logger.debug("test message", 123);
  });

  it("should have info method", () => {
    expect(typeof logger.info).toBe("function");
    logger.info("info message");
  });

  it("should have warn method", () => {
    expect(typeof logger.warn).toBe("function");
    logger.warn("warning message");
  });

  it("should have error method", () => {
    expect(typeof logger.error).toBe("function");
    logger.error("error message");
  });
});
