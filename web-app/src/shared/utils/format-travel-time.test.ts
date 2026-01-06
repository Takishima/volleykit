import { describe, it, expect } from "vitest";
import { formatTravelTime } from "./format-travel-time";

const units = { minutesUnit: "min", hoursUnit: "h" };

describe("formatTravelTime", () => {
  it("formats minutes under 60 with minutes unit", () => {
    expect(formatTravelTime(30, units)).toBe("30min");
    expect(formatTravelTime(45, units)).toBe("45min");
    expect(formatTravelTime(59, units)).toBe("59min");
  });

  it("formats exactly 60 minutes as 1 hour", () => {
    expect(formatTravelTime(60, units)).toBe("1h");
  });

  it("formats multiple hours without remaining minutes", () => {
    expect(formatTravelTime(120, units)).toBe("2h");
    expect(formatTravelTime(180, units)).toBe("3h");
  });

  it("formats hours and minutes combined", () => {
    expect(formatTravelTime(90, units)).toBe("1h 30min");
    expect(formatTravelTime(75, units)).toBe("1h 15min");
    expect(formatTravelTime(150, units)).toBe("2h 30min");
  });

  it("applies prefix when provided", () => {
    expect(formatTravelTime(30, units, "≤")).toBe("≤30min");
    expect(formatTravelTime(60, units, "≤")).toBe("≤1h");
    expect(formatTravelTime(90, units, "≤")).toBe("≤1h 30min");
  });

  it("handles edge case of 0 minutes", () => {
    expect(formatTravelTime(0, units)).toBe("0min");
  });

  it("uses provided unit labels", () => {
    const germanUnits = { minutesUnit: " Min.", hoursUnit: " Std." };
    expect(formatTravelTime(30, germanUnits)).toBe("30 Min.");
    expect(formatTravelTime(90, germanUnits)).toBe("1 Std. 30 Min.");
  });
});
