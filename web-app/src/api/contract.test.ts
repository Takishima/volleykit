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
import { useDemoStore, DEMO_USER_PERSON_IDENTITY } from "@/shared/stores/demo";
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

describe("Assignment details endpoint", () => {
  beforeEach(() => {
    useDemoStore.getState().initializeDemoData();
  });

  it("getAssignmentDetails returns valid assignment", async () => {
    const { assignments } = useDemoStore.getState();
    const firstAssignment = assignments[0];
    expect(firstAssignment).toBeDefined();

    const details = await mockApi.getAssignmentDetails(
      firstAssignment!.__identity,
      ["refereeGame.game.startingDateTime"],
    );

    expect(details.__identity).toBe(firstAssignment!.__identity);
    const result = assignmentSchema.safeParse(details);
    expect(result.success).toBe(true);
  });

  it("getAssignmentDetails throws for non-existent assignment", async () => {
    await expect(
      mockApi.getAssignmentDetails("non-existent-id", []),
    ).rejects.toThrow("Assignment not found");
  });
});

describe("Compensation details endpoint", () => {
  beforeEach(() => {
    useDemoStore.getState().initializeDemoData();
  });

  it("getCompensationDetails returns valid detailed compensation", async () => {
    const { compensations } = useDemoStore.getState();
    const firstComp = compensations[0];
    expect(firstComp?.convocationCompensation?.__identity).toBeDefined();

    const details = await mockApi.getCompensationDetails(
      firstComp!.convocationCompensation!.__identity!,
    );

    expect(details).toHaveProperty("convocationCompensation");
    expect(details.convocationCompensation).toBeDefined();
    expect(details.convocationCompensation).toHaveProperty("__identity");
    expect(details.convocationCompensation).toHaveProperty("distanceInMetres");
    // correctionReason can be null or string
    expect("correctionReason" in details.convocationCompensation!).toBe(true);
  });

  it("getCompensationDetails throws for non-existent compensation", async () => {
    await expect(
      mockApi.getCompensationDetails("non-existent-id"),
    ).rejects.toThrow("Compensation not found");
  });

  it("updateCompensation modifies compensation data", async () => {
    const { compensations } = useDemoStore.getState();
    const firstComp = compensations[0];
    const compensationId = firstComp!.convocationCompensation!.__identity!;

    await mockApi.updateCompensation(compensationId, {
      distanceInMetres: 50000,
      correctionReason: "Test correction",
    });

    // Verify the update was applied
    const { compensations: updatedCompensations } = useDemoStore.getState();
    const updated = updatedCompensations.find(
      (c) => c.convocationCompensation?.__identity === compensationId,
    );
    expect(updated?.convocationCompensation?.distanceInMetres).toBe(50000);
  });
});

describe("Exchange mutation endpoints", () => {
  beforeEach(() => {
    useDemoStore.getState().initializeDemoData();
  });

  it("applyForExchange removes exchange and creates assignment", async () => {
    const { exchanges, assignments } = useDemoStore.getState();
    // Find an open exchange that's not submitted by the demo user
    const openExchange = exchanges.find(
      (e) => e.status === "open" && e.submittedByPerson?.__identity !== DEMO_USER_PERSON_IDENTITY,
    );
    expect(openExchange).toBeDefined();

    const initialAssignmentCount = assignments.length;
    const initialExchangeCount = exchanges.length;

    await mockApi.applyForExchange(openExchange!.__identity);

    const { exchanges: updated, assignments: updatedAssignments } =
      useDemoStore.getState();

    // Exchange should be removed from the list
    const exchangeStillExists = updated.find(
      (e) => e.__identity === openExchange!.__identity,
    );
    expect(exchangeStillExists).toBeUndefined();
    expect(updated.length).toBe(initialExchangeCount - 1);

    // A new assignment should be created
    expect(updatedAssignments.length).toBe(initialAssignmentCount + 1);
  });

  it("withdrawFromExchange changes status back to open", async () => {
    const { exchanges } = useDemoStore.getState();
    const appliedExchange = exchanges.find((e) => e.status === "applied");
    expect(appliedExchange).toBeDefined();

    await mockApi.withdrawFromExchange(appliedExchange!.__identity);

    const { exchanges: updated } = useDemoStore.getState();
    const withdrawn = updated.find(
      (e) => e.__identity === appliedExchange!.__identity,
    );
    expect(withdrawn?.status).toBe("open");
    expect(withdrawn?.appliedBy).toBeUndefined();
  });
});

describe("Settings endpoints", () => {
  beforeEach(() => {
    useDemoStore.getState().initializeDemoData();
  });

  it("getAssociationSettings returns valid settings object", async () => {
    const settings = await mockApi.getAssociationSettings();

    expect(settings).toHaveProperty(
      "hoursAfterGameStartForRefereeToEditGameList",
    );
    expect(
      typeof settings.hoursAfterGameStartForRefereeToEditGameList,
    ).toBe("number");
  });

  it("getActiveSeason returns valid season with date range", async () => {
    const season = await mockApi.getActiveSeason();

    expect(season).toHaveProperty("seasonStartDate");
    expect(season).toHaveProperty("seasonEndDate");
    expect(typeof season.seasonStartDate).toBe("string");
    expect(typeof season.seasonEndDate).toBe("string");

    // Verify dates are valid ISO strings
    expect(() => new Date(season.seasonStartDate!)).not.toThrow();
    expect(() => new Date(season.seasonEndDate!)).not.toThrow();

    // Season end should be after season start
    const start = new Date(season.seasonStartDate!);
    const end = new Date(season.seasonEndDate!);
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });
});

describe("Nomination list endpoints", () => {
  beforeEach(() => {
    useDemoStore.getState().initializeDemoData();
  });

  it("getPossiblePlayerNominations returns valid nominations", async () => {
    const { nominationLists } = useDemoStore.getState();
    const gameId = Object.keys(nominationLists)[0];
    const nominationList = nominationLists[gameId!]!.home;

    const response = await mockApi.getPossiblePlayerNominations(
      nominationList.__identity!,
    );

    expect(response).toHaveProperty("items");
    expect(response).toHaveProperty("totalItemsCount");
    expect(Array.isArray(response.items)).toBe(true);
    expect(response.items!.length).toBeGreaterThan(0);

    // Verify structure of possible nominations
    response.items!.forEach((item) => {
      expect(item.__identity).toBeDefined();
      expect(item.indoorPlayer).toBeDefined();
      expect(item.licenseCategory).toBeDefined();
    });
  });
});

describe("Nomination list mutation endpoints", () => {
  beforeEach(() => {
    useDemoStore.getState().initializeDemoData();
  });

  it("updateNominationList returns updated list", async () => {
    const { nominationLists } = useDemoStore.getState();
    const gameId = Object.keys(nominationLists)[0]!;
    const nominationList = nominationLists[gameId]!.home;

    const result = await mockApi.updateNominationList(
      nominationList.__identity!,
      gameId,
      nominationList.team?.__identity ?? "team-id",
      [],
    );

    expect(result).toHaveProperty("__identity");
    expect(result).toHaveProperty("game");
    expect(result).toHaveProperty("team");
    expect(result.closed).toBe(false);
  });

  it("finalizeNominationList returns finalized list with closedAt", async () => {
    const { nominationLists } = useDemoStore.getState();
    const gameId = Object.keys(nominationLists)[0]!;
    const nominationList = nominationLists[gameId]!.home;

    const result = await mockApi.finalizeNominationList(
      nominationList.__identity!,
      gameId,
      nominationList.team?.__identity ?? "team-id",
      [],
    );

    expect(result).toHaveProperty("nominationList");
    expect(result.nominationList!.closed).toBe(true);
    expect(result.nominationList!.closedAt).toBeDefined();
    expect(result.nominationList!.closedBy).toBe("referee");
  });
});

describe("Scoresheet and game details endpoints", () => {
  beforeEach(() => {
    useDemoStore.getState().initializeDemoData();
  });

  it("getGameWithScoresheet returns valid game details", async () => {
    const { nominationLists } = useDemoStore.getState();
    const gameId = Object.keys(nominationLists)[0]!;

    const gameDetails = await mockApi.getGameWithScoresheet(gameId);

    expect(gameDetails).toHaveProperty("__identity");
    expect(gameDetails.__identity).toBe(gameId);
    expect(gameDetails).toHaveProperty("scoresheet");
    expect(gameDetails.scoresheet).toHaveProperty("__identity");
    expect(gameDetails.scoresheet).toHaveProperty("game");
    expect(gameDetails.scoresheet).toHaveProperty("isSimpleScoresheet");
    expect(gameDetails.scoresheet).toHaveProperty("hasFile");
  });

  it("getGameWithScoresheet includes nomination lists", async () => {
    const { nominationLists } = useDemoStore.getState();
    const gameId = Object.keys(nominationLists)[0]!;

    const gameDetails = await mockApi.getGameWithScoresheet(gameId);

    expect(gameDetails).toHaveProperty("nominationListOfTeamHome");
    expect(gameDetails).toHaveProperty("nominationListOfTeamAway");
    expect(gameDetails.nominationListOfTeamHome?.__identity).toBeDefined();
    expect(gameDetails.nominationListOfTeamAway?.__identity).toBeDefined();
  });

  it("updateScoresheet returns updated scoresheet", async () => {
    const { nominationLists, scorers } = useDemoStore.getState();
    const gameId = Object.keys(nominationLists)[0]!;
    const scorer = scorers[0]!;
    expect(scorer.__identity).toBeDefined();
    const scorerId = scorer.__identity!;

    const result = await mockApi.updateScoresheet(
      `scoresheet-${gameId}`,
      gameId,
      scorerId,
      false,
    );

    expect(result).toHaveProperty("__identity");
    expect(result).toHaveProperty("game");
    expect(result).toHaveProperty("writerPerson");
    expect(result.writerPerson?.__identity).toBe(scorerId);
    expect(result.isSimpleScoresheet).toBe(false);
    expect(result.hasFile).toBe(false);
  });

  it("finalizeScoresheet returns finalized scoresheet with closedAt", async () => {
    const { nominationLists, scorers } = useDemoStore.getState();
    const gameId = Object.keys(nominationLists)[0]!;
    const scorer = scorers[0]!;
    expect(scorer.__identity).toBeDefined();
    const scorerId = scorer.__identity!;

    const result = await mockApi.finalizeScoresheet(
      `scoresheet-${gameId}`,
      gameId,
      scorerId,
      "resource-123",
      undefined,
      false,
    );

    expect(result).toHaveProperty("__identity");
    expect(result).toHaveProperty("closedAt");
    expect(result.closedBy).toBe("referee");
    expect(result.hasFile).toBe(true);
  });

  it("finalizeScoresheet marks game as validated in store", async () => {
    const { nominationLists, scorers } = useDemoStore.getState();
    const gameId = Object.keys(nominationLists)[0]!;
    const scorer = scorers[0]!;
    expect(scorer.__identity).toBeDefined();
    const scorerId = scorer.__identity!;

    await mockApi.finalizeScoresheet(
      `scoresheet-${gameId}`,
      gameId,
      scorerId,
      "resource-123",
    );

    const { validatedGames } = useDemoStore.getState();
    expect(validatedGames[gameId]).toBeDefined();
    expect(validatedGames[gameId]?.scorer.__identity).toBe(scorerId);
    expect(validatedGames[gameId]?.scoresheetFileId).toBe("resource-123");
  });
});

describe("File upload endpoint", () => {
  it("uploadResource rejects invalid file types", async () => {
    const invalidFile = new File(["test"], "test.txt", {
      type: "text/plain",
    });

    await expect(mockApi.uploadResource(invalidFile)).rejects.toThrow(
      "Invalid file type",
    );
  });

  it("uploadResource rejects files that are too large", async () => {
    // Create a mock file larger than 10MB
    const largeContent = new Array(11 * 1024 * 1024).fill("x").join("");
    const largeFile = new File([largeContent], "large.pdf", {
      type: "application/pdf",
    });

    await expect(mockApi.uploadResource(largeFile)).rejects.toThrow(
      "File too large",
    );
  });

  it("uploadResource accepts valid PDF files", async () => {
    const validFile = new File(["test content"], "test.pdf", {
      type: "application/pdf",
    });

    const result = await mockApi.uploadResource(validFile);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0]).toHaveProperty("__identity");
    expect(result[0]).toHaveProperty("persistentResource");
    expect(result[0]?.persistentResource?.filename).toBe("test.pdf");
    expect(result[0]?.persistentResource?.mediaType).toBe("application/pdf");
  });

  it("uploadResource accepts valid JPEG files", async () => {
    const validFile = new File(["test content"], "scoresheet.jpg", {
      type: "image/jpeg",
    });

    const result = await mockApi.uploadResource(validFile);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0]).toHaveProperty("__identity");
    expect(result[0]).toHaveProperty("persistentResource");
    expect(result[0]?.persistentResource?.filename).toBe("scoresheet.jpg");
    expect(result[0]?.persistentResource?.mediaType).toBe("image/jpeg");
  });

  it("uploadResource accepts valid PNG files", async () => {
    const validFile = new File(["test content"], "scoresheet.png", {
      type: "image/png",
    });

    const result = await mockApi.uploadResource(validFile);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0]).toHaveProperty("__identity");
    expect(result[0]).toHaveProperty("persistentResource");
    expect(result[0]?.persistentResource?.filename).toBe("scoresheet.png");
    expect(result[0]?.persistentResource?.mediaType).toBe("image/png");
  });
});

describe("Filtering and pagination", () => {
  beforeEach(() => {
    useDemoStore.getState().initializeDemoData();
  });

  it("searchAssignments respects limit parameter", async () => {
    const response = await mockApi.searchAssignments({ limit: 2 });

    expect(response.items.length).toBeLessThanOrEqual(2);
    expect(response.totalItemsCount).toBeGreaterThan(0);
  });

  it("searchAssignments respects offset parameter", async () => {
    const fullResponse = await mockApi.searchAssignments();
    const offsetResponse = await mockApi.searchAssignments({ offset: 1 });

    expect(offsetResponse.items.length).toBe(fullResponse.items.length - 1);
    expect(offsetResponse.items[0]?.__identity).toBe(
      fullResponse.items[1]?.__identity,
    );
  });

  it("searchExchanges filters by status", async () => {
    const response = await mockApi.searchExchanges({
      propertyFilters: [{ propertyName: "status", enumValues: ["open"] }],
    });

    response.items.forEach((exchange) => {
      expect(exchange.status).toBe("open");
    });
  });

  it("searchCompensations sorts by date descending", async () => {
    const response = await mockApi.searchCompensations({
      propertyOrderings: [
        { propertyName: "compensationDate", descending: true },
      ],
    });

    // Verify dates are in descending order
    for (let i = 1; i < response.items.length; i++) {
      const prevDate = new Date(response.items[i - 1]!.compensationDate!);
      const currDate = new Date(response.items[i]!.compensationDate!);
      expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
    }
  });

  it("searchPersons filters by lastName", async () => {
    const response = await mockApi.searchPersons({ lastName: "Müller" });

    expect(response.items).toBeDefined();
    expect(response.items!.length).toBeGreaterThan(0);
    // The mock API uses accent-insensitive search, normalizing "Müller" to "muller"
    response.items!.forEach((person) => {
      const normalize = (s: string) =>
        s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const matchesFirst = normalize(person.firstName ?? "").includes("muller");
      const matchesLast = normalize(person.lastName ?? "").includes("muller");
      expect(matchesFirst || matchesLast).toBe(true);
    });
  });
});
