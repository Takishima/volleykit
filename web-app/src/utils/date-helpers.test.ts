import { describe, it, expect } from "vitest";
import { formatDateTime, formatDOB } from "./date-helpers";

describe("formatDateTime", () => {
  it("returns TBD for undefined", () => {
    expect(formatDateTime(undefined)).toBe("TBD");
  });

  it("returns TBD for invalid date string", () => {
    expect(formatDateTime("not-a-date")).toBe("TBD");
  });

  it("returns TBD for empty string", () => {
    expect(formatDateTime("")).toBe("TBD");
  });

  it("formats valid ISO string", () => {
    const result = formatDateTime("2024-03-20T15:30:00Z");
    // Check that result contains expected date components (locale-independent)
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/Mar/);
    expect(result).toMatch(/20/);
  });

  it("handles ISO strings with timezone offsets", () => {
    const result = formatDateTime("2024-06-15T10:00:00+02:00");
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/Jun/);
  });

  it("handles ISO strings without timezone info", () => {
    const result = formatDateTime("2024-12-25T18:30:00");
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/Dec/);
    expect(result).toMatch(/25/);
  });

  it("returns TBD for malformed dates that create Invalid Date", () => {
    expect(formatDateTime("2024-13-45T99:99:99Z")).toBe("TBD");
  });
});

describe("formatDOB", () => {
  it("returns empty string for undefined", () => {
    expect(formatDOB(undefined)).toBe("");
  });

  it("returns empty string for null", () => {
    expect(formatDOB(null)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(formatDOB("")).toBe("");
  });

  it("returns empty string for invalid date", () => {
    expect(formatDOB("not-a-date")).toBe("");
  });

  it("formats valid ISO date as DD.MM.YY", () => {
    expect(formatDOB("1990-05-15")).toBe("15.05.90");
  });

  it("formats ISO datetime as DD.MM.YY", () => {
    expect(formatDOB("1985-12-03T10:30:00Z")).toBe("03.12.85");
  });

  it("pads single-digit day and month with zeros", () => {
    expect(formatDOB("2000-01-05")).toBe("05.01.00");
  });

  it("handles dates from 2000s correctly", () => {
    expect(formatDOB("2005-07-20")).toBe("20.07.05");
  });
});
