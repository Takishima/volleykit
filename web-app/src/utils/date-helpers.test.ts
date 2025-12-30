import { describe, it, expect } from "vitest";
import { formatDateTime, formatDOB, groupByWeek } from "./date-helpers";

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

describe("groupByWeek", () => {
  interface TestItem {
    id: string;
    date: string | null | undefined;
  }

  const getDate = (item: TestItem) => item.date;

  it("returns empty array for empty input", () => {
    expect(groupByWeek([], getDate)).toEqual([]);
  });

  it("groups items in a single week into one group", () => {
    const items: TestItem[] = [
      { id: "1", date: "2025-01-06T10:00:00Z" }, // Monday
      { id: "2", date: "2025-01-08T14:00:00Z" }, // Wednesday
      { id: "3", date: "2025-01-12T09:00:00Z" }, // Sunday
    ];

    const result = groupByWeek(items, getDate);

    expect(result).toHaveLength(1);
    expect(result[0]!.week.key).toBe("2025-W02");
    expect(result[0]!.items).toHaveLength(3);
    expect(result[0]!.items.map((i) => i.id)).toEqual(["1", "2", "3"]);
  });

  it("groups items spanning multiple weeks into separate groups", () => {
    const items: TestItem[] = [
      { id: "1", date: "2025-01-06T10:00:00Z" }, // Week 2
      { id: "2", date: "2025-01-13T14:00:00Z" }, // Week 3
      { id: "3", date: "2025-01-20T09:00:00Z" }, // Week 4
    ];

    const result = groupByWeek(items, getDate);

    expect(result).toHaveLength(3);
    expect(result[0]!.week.key).toBe("2025-W02");
    expect(result[1]!.week.key).toBe("2025-W03");
    expect(result[2]!.week.key).toBe("2025-W04");
    expect(result[0]!.items[0]!.id).toBe("1");
    expect(result[1]!.items[0]!.id).toBe("2");
    expect(result[2]!.items[0]!.id).toBe("3");
  });

  it("skips items with null dates", () => {
    const items: TestItem[] = [
      { id: "1", date: "2025-01-06T10:00:00Z" },
      { id: "2", date: null },
      { id: "3", date: "2025-01-08T14:00:00Z" },
    ];

    const result = groupByWeek(items, getDate);

    expect(result).toHaveLength(1);
    expect(result[0]!.items).toHaveLength(2);
    expect(result[0]!.items.map((i) => i.id)).toEqual(["1", "3"]);
  });

  it("skips items with undefined dates", () => {
    const items: TestItem[] = [
      { id: "1", date: "2025-01-06T10:00:00Z" },
      { id: "2", date: undefined },
      { id: "3", date: "2025-01-08T14:00:00Z" },
    ];

    const result = groupByWeek(items, getDate);

    expect(result).toHaveLength(1);
    expect(result[0]!.items).toHaveLength(2);
  });

  it("skips items with invalid date strings", () => {
    const items: TestItem[] = [
      { id: "1", date: "2025-01-06T10:00:00Z" },
      { id: "2", date: "not-a-date" },
      { id: "3", date: "2025-01-08T14:00:00Z" },
    ];

    const result = groupByWeek(items, getDate);

    expect(result).toHaveLength(1);
    expect(result[0]!.items).toHaveLength(2);
  });

  it("handles cross-year week boundaries correctly", () => {
    const items: TestItem[] = [
      { id: "1", date: "2024-12-30T10:00:00Z" }, // Monday of week 1, 2025 (ISO week)
      { id: "2", date: "2025-01-05T14:00:00Z" }, // Sunday of week 1, 2025
    ];

    const result = groupByWeek(items, getDate);

    expect(result).toHaveLength(1);
    expect(result[0]!.week.weekNumber).toBe(1);
    expect(result[0]!.items).toHaveLength(2);
  });

  it("sets correct week start and end dates", () => {
    const items: TestItem[] = [
      { id: "1", date: "2025-01-08T10:00:00Z" }, // Wednesday
    ];

    const result = groupByWeek(items, getDate);

    expect(result).toHaveLength(1);
    // Week starts on Monday (Jan 6) and ends on Sunday (Jan 12)
    expect(result[0]!.week.weekStart.getDate()).toBe(6);
    expect(result[0]!.week.weekEnd.getDate()).toBe(12);
  });

  it("returns empty array when all items have invalid dates", () => {
    const items: TestItem[] = [
      { id: "1", date: null },
      { id: "2", date: "invalid" },
      { id: "3", date: undefined },
    ];

    const result = groupByWeek(items, getDate);

    expect(result).toEqual([]);
  });
});
