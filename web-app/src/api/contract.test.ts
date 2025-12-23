/**
 * Contract tests to verify mock data matches API schemas.
 *
 * These tests ensure that demo mode data conforms to the same Zod schemas
 * used to validate real API responses. When these tests fail, it indicates
 * a divergence between mock and real API that would cause issues when
 * switching from demo mode to production.
 *
 * Run these tests before deploying to catch mock/API mismatches early.
 */
import { describe, it, expect, beforeEach } from "vitest";
import type { ZodError } from "zod";
import { useDemoStore } from "@/stores/demo";
import {
  assignmentSchema,
  compensationRecordSchema,
  gameExchangeSchema,
  personSearchResultSchema,
  assignmentsResponseSchema,
  compensationsResponseSchema,
  exchangesResponseSchema,
  personSearchResponseSchema,
} from "./validation";
import { mockApi } from "./mock-api";

/** Format Zod validation errors into a readable string. */
function formatZodErrors(error: ZodError): string {
  return error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
}

/** Create a validation error with context about the failed item. */
function validationError(
  label: string,
  index: number,
  error: ZodError,
  data: unknown,
): Error {
  return new Error(
    `${label} ${index} failed validation:\n${formatZodErrors(error)}\n\nData: ${JSON.stringify(data, null, 2)}`,
  );
}

/** Create a validation error for API responses. */
function responseValidationError(label: string, error: ZodError): Error {
  return new Error(`${label} failed validation:\n${formatZodErrors(error)}`);
}

describe("Mock data contract tests", () => {
  beforeEach(() => {
    useDemoStore.getState().initializeDemoData();
  });

  describe("Assignments", () => {
    it("each assignment passes schema validation", () => {
      const { assignments } = useDemoStore.getState();

      expect(assignments.length).toBeGreaterThan(0);

      assignments.forEach((assignment, index) => {
        const result = assignmentSchema.safeParse(assignment);
        if (!result.success) {
          throw validationError("Assignment", index, result.error, assignment);
        }
        expect(result.success).toBe(true);
      });
    });

    it("searchAssignments response passes schema validation", async () => {
      const response = await mockApi.searchAssignments();

      const result = assignmentsResponseSchema.safeParse(response);
      if (!result.success) {
        throw responseValidationError("Assignments response", result.error);
      }
      expect(result.success).toBe(true);
    });

    it("assignments have required fields for UI", () => {
      const { assignments } = useDemoStore.getState();

      assignments.forEach((assignment) => {
        expect(assignment.__identity).toBeDefined();
        expect(assignment.refereeConvocationStatus).toBeDefined();
        expect(assignment.refereePosition).toBeDefined();
        expect(assignment.refereeGame).toBeDefined();
        expect(assignment.refereeGame?.game).toBeDefined();
      });
    });
  });

  describe("Compensations", () => {
    it("each compensation passes schema validation", () => {
      const { compensations } = useDemoStore.getState();

      expect(compensations.length).toBeGreaterThan(0);

      compensations.forEach((compensation, index) => {
        const result = compensationRecordSchema.safeParse(compensation);
        if (!result.success) {
          throw validationError(
            "Compensation",
            index,
            result.error,
            compensation,
          );
        }
        expect(result.success).toBe(true);
      });
    });

    it("searchCompensations response passes schema validation", async () => {
      const response = await mockApi.searchCompensations();

      const result = compensationsResponseSchema.safeParse(response);
      if (!result.success) {
        throw responseValidationError("Compensations response", result.error);
      }
      expect(result.success).toBe(true);
    });

    it("compensations have required fields for UI", () => {
      const { compensations } = useDemoStore.getState();

      compensations.forEach((comp) => {
        expect(comp.__identity).toBeDefined();
        expect(comp.refereeConvocationStatus).toBeDefined();
        expect(comp.refereePosition).toBeDefined();
        expect(comp.convocationCompensation).toBeDefined();
        expect(comp.refereeGame).toBeDefined();
      });
    });
  });

  describe("Exchanges", () => {
    it("each exchange passes schema validation", () => {
      const { exchanges } = useDemoStore.getState();

      expect(exchanges.length).toBeGreaterThan(0);

      exchanges.forEach((exchange, index) => {
        const result = gameExchangeSchema.safeParse(exchange);
        if (!result.success) {
          throw validationError("Exchange", index, result.error, exchange);
        }
        expect(result.success).toBe(true);
      });
    });

    it("searchExchanges response passes schema validation", async () => {
      const response = await mockApi.searchExchanges();

      const result = exchangesResponseSchema.safeParse(response);
      if (!result.success) {
        throw responseValidationError("Exchanges response", result.error);
      }
      expect(result.success).toBe(true);
    });

    it("exchanges have required fields for UI", () => {
      const { exchanges } = useDemoStore.getState();

      exchanges.forEach((exchange) => {
        expect(exchange.__identity).toBeDefined();
        expect(exchange.status).toBeDefined();
        expect(exchange.refereePosition).toBeDefined();
        expect(exchange.refereeGame).toBeDefined();
      });
    });
  });

  describe("Person Search (Scorers)", () => {
    it("each scorer passes schema validation", () => {
      const { scorers } = useDemoStore.getState();

      expect(scorers.length).toBeGreaterThan(0);

      scorers.forEach((scorer, index) => {
        const result = personSearchResultSchema.safeParse(scorer);
        if (!result.success) {
          throw validationError("Scorer", index, result.error, scorer);
        }
        expect(result.success).toBe(true);
      });
    });

    it("searchPersons response passes schema validation", async () => {
      const response = await mockApi.searchPersons({});

      const result = personSearchResponseSchema.safeParse(response);
      if (!result.success) {
        throw responseValidationError("Person search response", result.error);
      }
      expect(result.success).toBe(true);
    });

    it("scorers have required fields for UI", () => {
      const { scorers } = useDemoStore.getState();

      scorers.forEach((scorer) => {
        expect(scorer.__identity).toBeDefined();
        expect(scorer.firstName).toBeDefined();
        expect(scorer.lastName).toBeDefined();
        expect(scorer.displayName).toBeDefined();
      });
    });
  });

  describe("Association switching", () => {
    it("SV association data passes validation", () => {
      useDemoStore.getState().setActiveAssociation("SV");
      const { assignments, compensations, exchanges } =
        useDemoStore.getState();

      expect(assignments.length).toBeGreaterThan(0);
      expect(compensations.length).toBeGreaterThan(0);
      expect(exchanges.length).toBeGreaterThan(0);

      expect(assignmentSchema.safeParse(assignments[0]).success).toBe(true);
      expect(compensationRecordSchema.safeParse(compensations[0]).success).toBe(
        true,
      );
      expect(gameExchangeSchema.safeParse(exchanges[0]).success).toBe(true);
    });

    it("Regional association data passes validation", () => {
      useDemoStore.getState().setActiveAssociation("SVRBA");
      const { assignments, compensations, exchanges } =
        useDemoStore.getState();

      expect(assignments.length).toBeGreaterThan(0);
      expect(compensations.length).toBeGreaterThan(0);
      expect(exchanges.length).toBeGreaterThan(0);

      expect(assignmentSchema.safeParse(assignments[0]).success).toBe(true);
      expect(compensationRecordSchema.safeParse(compensations[0]).success).toBe(
        true,
      );
      expect(gameExchangeSchema.safeParse(exchanges[0]).success).toBe(true);
    });
  });
});

describe("Mock API response structure matches real API", () => {
  beforeEach(() => {
    useDemoStore.getState().initializeDemoData();
  });

  it("assignments response has same shape as real API", async () => {
    const response = await mockApi.searchAssignments();

    expect(response).toHaveProperty("items");
    expect(response).toHaveProperty("totalItemsCount");
    expect(Array.isArray(response.items)).toBe(true);
    expect(typeof response.totalItemsCount).toBe("number");
  });

  it("compensations response has same shape as real API", async () => {
    const response = await mockApi.searchCompensations();

    expect(response).toHaveProperty("items");
    expect(response).toHaveProperty("totalItemsCount");
    expect(Array.isArray(response.items)).toBe(true);
    expect(typeof response.totalItemsCount).toBe("number");
  });

  it("exchanges response has same shape as real API", async () => {
    const response = await mockApi.searchExchanges();

    expect(response).toHaveProperty("items");
    expect(response).toHaveProperty("totalItemsCount");
    expect(Array.isArray(response.items)).toBe(true);
    expect(typeof response.totalItemsCount).toBe("number");
  });

  it("person search response has same shape as real API", async () => {
    const response = await mockApi.searchPersons({});

    expect(response).toHaveProperty("items");
    expect(response).toHaveProperty("totalItemsCount");
    expect(Array.isArray(response.items)).toBe(true);
    expect(typeof response.totalItemsCount).toBe("number");
  });
});
