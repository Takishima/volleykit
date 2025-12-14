import { describe, expect, it } from "vitest";

import { dateSchema, compensationRecordSchema } from "./validation";

describe("dateSchema", () => {
  it("accepts ISO date format", () => {
    const result = dateSchema.safeParse("2024-01-15");
    expect(result.success).toBe(true);
  });

  it("accepts ISO datetime with microseconds", () => {
    const result = dateSchema.safeParse("2024-12-19T23:00:00.000000+00:00");
    expect(result.success).toBe(true);
  });

  it("accepts ISO datetime without microseconds", () => {
    const result = dateSchema.safeParse("2024-12-19T23:00:00+00:00");
    expect(result.success).toBe(true);
  });

  it("accepts null for unpaid compensations", () => {
    const result = dateSchema.safeParse(null);
    expect(result.success).toBe(true);
  });

  it("accepts undefined (optional)", () => {
    const result = dateSchema.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  it("accepts empty string for unpaid compensations", () => {
    const result = dateSchema.safeParse("");
    expect(result.success).toBe(true);
  });

  it("rejects invalid date format", () => {
    const result = dateSchema.safeParse("invalid-date");
    expect(result.success).toBe(false);
  });

  it("rejects partial date format", () => {
    const result = dateSchema.safeParse("2024-01");
    expect(result.success).toBe(false);
  });

  it("rejects date with wrong separator", () => {
    const result = dateSchema.safeParse("2024/01/15");
    expect(result.success).toBe(false);
  });
});

describe("compensationRecordSchema with dateSchema", () => {
  const validCompensationBase = {
    __identity: "550e8400-e29b-41d4-a716-446655440000",
    refereeGame: {
      __identity: "550e8400-e29b-41d4-a716-446655440001",
    },
    convocationCompensation: {},
    refereeConvocationStatus: "active",
    refereePosition: "head-one",
  };

  it("accepts compensation with ISO date paymentValueDate", () => {
    const result = compensationRecordSchema.safeParse({
      ...validCompensationBase,
      convocationCompensation: {
        paymentValueDate: "2024-01-15",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts compensation with ISO datetime paymentValueDate", () => {
    const result = compensationRecordSchema.safeParse({
      ...validCompensationBase,
      convocationCompensation: {
        paymentValueDate: "2024-12-19T23:00:00.000000+00:00",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts compensation with null paymentValueDate", () => {
    const result = compensationRecordSchema.safeParse({
      ...validCompensationBase,
      convocationCompensation: {
        paymentValueDate: null,
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts compensation with empty string paymentValueDate", () => {
    const result = compensationRecordSchema.safeParse({
      ...validCompensationBase,
      convocationCompensation: {
        paymentValueDate: "",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts compensation without paymentValueDate (undefined)", () => {
    const result = compensationRecordSchema.safeParse({
      ...validCompensationBase,
      convocationCompensation: {},
    });
    expect(result.success).toBe(true);
  });
});
