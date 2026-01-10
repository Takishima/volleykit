import { describe, it, expect } from "vitest";
import {
  isUserAssignment,
  extractUserOnCallAssignments,
} from "./useMyOnCallAssignments";
import type {
  RefereeBackupEntry,
  BackupRefereeAssignment,
} from "@/api/client";

// Helper to create minimal test assignments with required type casting
const createTestAssignment = (
  partial: Partial<BackupRefereeAssignment> & { __identity: string },
): BackupRefereeAssignment => partial as BackupRefereeAssignment;

describe("isUserAssignment", () => {
  const userId = "user-123";

  it("returns true when person.__identity matches", () => {
    const assignment = createTestAssignment({
      __identity: "assignment-1",
      indoorReferee: {
        person: {
          __identity: userId,
        },
      },
    });
    expect(isUserAssignment(assignment, userId)).toBe(true);
  });

  it("returns true when person.persistenceObjectIdentifier matches (fallback)", () => {
    const assignment = createTestAssignment({
      __identity: "assignment-1",
      indoorReferee: {
        person: {
          persistenceObjectIdentifier: userId,
        },
      },
    });
    expect(isUserAssignment(assignment, userId)).toBe(true);
  });

  it("returns false when person ID does not match", () => {
    const assignment = createTestAssignment({
      __identity: "assignment-1",
      indoorReferee: {
        person: {
          __identity: "other-user",
        },
      },
    });
    expect(isUserAssignment(assignment, userId)).toBe(false);
  });

  it("returns false when indoorReferee is missing", () => {
    const assignment = createTestAssignment({
      __identity: "assignment-1",
    });
    expect(isUserAssignment(assignment, userId)).toBe(false);
  });

  it("returns false when person is missing", () => {
    const assignment = createTestAssignment({
      __identity: "assignment-1",
      indoorReferee: {},
    });
    expect(isUserAssignment(assignment, userId)).toBe(false);
  });

  it("prefers __identity over persistenceObjectIdentifier on person", () => {
    const assignment = createTestAssignment({
      __identity: "assignment-1",
      indoorReferee: {
        person: {
          __identity: userId,
          persistenceObjectIdentifier: "other-user",
        },
      },
    });
    expect(isUserAssignment(assignment, userId)).toBe(true);
  });
});

describe("extractUserOnCallAssignments", () => {
  const userId = "user-123";

  const createAssignment = (id: string, personId: string) =>
    createTestAssignment({
      __identity: id,
      indoorReferee: {
        person: {
          __identity: personId,
        },
      },
    });

  it("extracts NLA assignments for the user", () => {
    const entries: RefereeBackupEntry[] = [
      {
        __identity: "entry-1",
        date: "2026-01-15T00:00:00.000Z", // API returns midnight
        weekday: "Mi",
        calendarWeek: 3,
        nlaReferees: [createAssignment("nla-1", userId)],
      },
    ];

    const result = extractUserOnCallAssignments(entries, userId);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "entry-1-NLA",
      league: "NLA",
      date: "2026-01-15T12:00:00.000Z", // Normalized to noon
    });
  });

  it("extracts NLB assignments for the user", () => {
    const entries: RefereeBackupEntry[] = [
      {
        __identity: "entry-1",
        date: "2026-01-15T00:00:00.000Z", // API returns midnight
        weekday: "Mi",
        calendarWeek: 3,
        nlbReferees: [createAssignment("nlb-1", userId)],
      },
    ];

    const result = extractUserOnCallAssignments(entries, userId);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "entry-1-NLB",
      league: "NLB",
    });
  });

  it("extracts both NLA and NLB assignments on the same day", () => {
    const entries: RefereeBackupEntry[] = [
      {
        __identity: "entry-1",
        date: "2026-01-15T00:00:00.000Z", // API returns midnight
        weekday: "Mi",
        calendarWeek: 3,
        nlaReferees: [createAssignment("nla-1", userId)],
        nlbReferees: [createAssignment("nlb-1", userId)],
      },
    ];

    const result = extractUserOnCallAssignments(entries, userId);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.league)).toEqual(["NLA", "NLB"]);
  });

  it("ignores assignments for other users", () => {
    const entries: RefereeBackupEntry[] = [
      {
        __identity: "entry-1",
        date: "2026-01-15T00:00:00.000Z", // API returns midnight
        weekday: "Mi",
        calendarWeek: 3,
        nlaReferees: [
          createAssignment("nla-1", "other-user"),
          createAssignment("nla-2", userId),
        ],
      },
    ];

    const result = extractUserOnCallAssignments(entries, userId);

    expect(result).toHaveLength(1);
    expect(result[0]?.assignment.__identity).toBe("nla-2");
  });

  it("handles empty referee arrays", () => {
    const entries: RefereeBackupEntry[] = [
      {
        __identity: "entry-1",
        date: "2026-01-15T00:00:00.000Z", // API returns midnight
        weekday: "Mi",
        calendarWeek: 3,
        nlaReferees: [],
        nlbReferees: [],
      },
    ];

    const result = extractUserOnCallAssignments(entries, userId);

    expect(result).toHaveLength(0);
  });

  it("handles missing referee arrays", () => {
    const entries: RefereeBackupEntry[] = [
      {
        __identity: "entry-1",
        date: "2026-01-15T00:00:00.000Z", // API returns midnight
        weekday: "Mi",
        calendarWeek: 3,
      },
    ];

    const result = extractUserOnCallAssignments(entries, userId);

    expect(result).toHaveLength(0);
  });

  it("sorts results by date ascending", () => {
    const entries: RefereeBackupEntry[] = [
      {
        __identity: "entry-2",
        date: "2026-01-22T00:00:00.000Z",
        weekday: "Mi",
        calendarWeek: 4,
        nlaReferees: [createAssignment("nla-2", userId)],
      },
      {
        __identity: "entry-1",
        date: "2026-01-15T00:00:00.000Z", // API returns midnight
        weekday: "Mi",
        calendarWeek: 3,
        nlaReferees: [createAssignment("nla-1", userId)],
      },
    ];

    const result = extractUserOnCallAssignments(entries, userId);

    expect(result).toHaveLength(2);
    // Both dates normalized to noon
    expect(result[0]?.date).toBe("2026-01-15T12:00:00.000Z");
    expect(result[1]?.date).toBe("2026-01-22T12:00:00.000Z");
  });

  it("returns empty array for empty entries", () => {
    const result = extractUserOnCallAssignments([], userId);
    expect(result).toHaveLength(0);
  });
});
