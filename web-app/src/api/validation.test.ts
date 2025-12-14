import { describe, expect, it } from "vitest";

import {
  dateSchema,
  compensationRecordSchema,
  personSearchResultSchema,
  personSearchResponseSchema,
  validateResponse,
} from "./validation";

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

describe("personSearchResultSchema", () => {
  const validPerson = {
    __identity: "a1111111-1111-4111-a111-111111111111",
    firstName: "Hans",
    lastName: "Müller",
    displayName: "Hans Müller",
    associationId: 12345,
    birthday: "1985-03-15T00:00:00+00:00",
    gender: "m" as const,
  };

  it("accepts valid person search result", () => {
    const result = personSearchResultSchema.safeParse(validPerson);
    expect(result.success).toBe(true);
  });

  it("accepts person with minimal required fields", () => {
    const result = personSearchResultSchema.safeParse({
      __identity: "a1111111-1111-4111-a111-111111111111",
    });
    expect(result.success).toBe(true);
  });

  it("accepts person with null optional fields", () => {
    const result = personSearchResultSchema.safeParse({
      __identity: "a1111111-1111-4111-a111-111111111111",
      associationId: null,
      birthday: null,
      gender: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts female gender", () => {
    const result = personSearchResultSchema.safeParse({
      ...validPerson,
      gender: "f",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID for __identity", () => {
    const result = personSearchResultSchema.safeParse({
      ...validPerson,
      __identity: "invalid-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing __identity", () => {
    const { __identity: _unused, ...personWithoutId } = validPerson;
    void _unused; // Satisfies no-unused-vars lint rule
    const result = personSearchResultSchema.safeParse(personWithoutId);
    expect(result.success).toBe(false);
  });

  it("allows unknown fields via passthrough", () => {
    const result = personSearchResultSchema.safeParse({
      ...validPerson,
      unknownField: "some value",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unknownField).toBe("some value");
    }
  });
});

describe("personSearchResponseSchema", () => {
  const validPerson = {
    __identity: "a1111111-1111-4111-a111-111111111111",
    firstName: "Hans",
    lastName: "Müller",
  };

  it("accepts valid response with items", () => {
    const result = personSearchResponseSchema.safeParse({
      items: [validPerson],
      totalItemsCount: 1,
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty items array", () => {
    const result = personSearchResponseSchema.safeParse({
      items: [],
      totalItemsCount: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts response without items (optional)", () => {
    const result = personSearchResponseSchema.safeParse({
      totalItemsCount: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts response without totalItemsCount (optional)", () => {
    const result = personSearchResponseSchema.safeParse({
      items: [validPerson],
    });
    expect(result.success).toBe(true);
  });

  it("rejects items with invalid __identity", () => {
    const result = personSearchResponseSchema.safeParse({
      items: [{ ...validPerson, __identity: "not-a-uuid" }],
      totalItemsCount: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-array items", () => {
    const result = personSearchResponseSchema.safeParse({
      items: "not-an-array",
      totalItemsCount: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe("validateResponse", () => {
  it("returns validated data for valid input", () => {
    const validResponse = {
      items: [
        {
          __identity: "a1111111-1111-4111-a111-111111111111",
          firstName: "Hans",
        },
      ],
      totalItemsCount: 1,
    };

    const result = validateResponse(
      validResponse,
      personSearchResponseSchema,
      "test",
    );

    expect(result.items).toHaveLength(1);
    expect(result.items?.[0]?.__identity).toBe(
      "a1111111-1111-4111-a111-111111111111",
    );
  });

  it("throws descriptive error for invalid input", () => {
    const invalidResponse = {
      items: [{ __identity: "invalid-uuid" }],
      totalItemsCount: 1,
    };

    expect(() =>
      validateResponse(invalidResponse, personSearchResponseSchema, "test"),
    ).toThrow(/Invalid API response for test/);
  });

  it("includes field path in error message", () => {
    const invalidResponse = {
      items: [{ __identity: "invalid-uuid" }],
      totalItemsCount: 1,
    };

    expect(() =>
      validateResponse(invalidResponse, personSearchResponseSchema, "test"),
    ).toThrow(/items\.0\.__identity/);
  });
});
