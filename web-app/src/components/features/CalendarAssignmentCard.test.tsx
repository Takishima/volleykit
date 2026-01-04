import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalendarAssignmentCard } from "./CalendarAssignmentCard";
import type { CalendarAssignment } from "@/api/calendar-api";

// Mock date to ensure consistent test results
const mockDate = new Date("2025-12-15T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(mockDate);
});

afterEach(() => {
  vi.useRealTimers();
});

function createMockCalendarAssignment(
  overrides: Partial<CalendarAssignment> = {},
): CalendarAssignment {
  return {
    gameId: "game-123",
    gameNumber: null,
    role: "referee1",
    roleRaw: "1. SR",
    startTime: "2025-12-16T18:00:00Z",
    endTime: "2025-12-16T20:00:00Z",
    homeTeam: "VBC Zürich",
    awayTeam: "VBC Basel",
    league: "NLA Men",
    leagueCategory: null,
    address: "Saalsporthalle, Zürich",
    coordinates: null,
    hallName: null,
    hallId: null,
    gender: "men",
    mapsUrl: null,
    referees: {},
    ...overrides,
  };
}

describe("CalendarAssignmentCard", () => {
  describe("date display", () => {
    it("should show 'Today' for today's assignments", () => {
      const assignment = createMockCalendarAssignment({
        startTime: "2025-12-15T18:00:00Z", // Same day as mockDate
      });

      render(<CalendarAssignmentCard assignment={assignment} />);

      expect(screen.getByText(/today/i)).toBeInTheDocument();
    });

    it("should show 'Tomorrow' for tomorrow's assignments", () => {
      const assignment = createMockCalendarAssignment({
        startTime: "2025-12-16T18:00:00Z", // Day after mockDate
      });

      render(<CalendarAssignmentCard assignment={assignment} />);

      expect(screen.getByText(/tomorrow/i)).toBeInTheDocument();
    });

    it("should show full date for other days", () => {
      const assignment = createMockCalendarAssignment({
        startTime: "2025-12-20T18:00:00Z", // 5 days after mockDate
      });

      render(<CalendarAssignmentCard assignment={assignment} />);

      // Should show day of week and date
      expect(screen.getByText(/saturday.*20.*december/i)).toBeInTheDocument();
    });
  });

  describe("team display", () => {
    it("should display home and away teams", () => {
      const assignment = createMockCalendarAssignment({
        homeTeam: "Team A",
        awayTeam: "Team B",
      });

      render(<CalendarAssignmentCard assignment={assignment} />);

      expect(screen.getByText("Team A")).toBeInTheDocument();
      expect(screen.getByText("Team B")).toBeInTheDocument();
    });

    it("should show 'Unknown' for missing team names", () => {
      const assignment = createMockCalendarAssignment({
        homeTeam: undefined,
        awayTeam: undefined,
      });

      render(<CalendarAssignmentCard assignment={assignment} />);

      // Should have two "Unknown" texts (home and away)
      expect(screen.getAllByText(/unknown/i)).toHaveLength(2);
    });

    it("should display vs separator between teams", () => {
      const assignment = createMockCalendarAssignment();

      render(<CalendarAssignmentCard assignment={assignment} />);

      expect(screen.getByText(/vs/i)).toBeInTheDocument();
    });
  });

  describe("role display", () => {
    it("should display the role badge", () => {
      const assignment = createMockCalendarAssignment({
        roleRaw: "2. SR",
      });

      render(<CalendarAssignmentCard assignment={assignment} />);

      expect(screen.getByText("2. SR")).toBeInTheDocument();
    });
  });

  describe("league display", () => {
    it("should display the league when provided", () => {
      const assignment = createMockCalendarAssignment({
        league: "1. Liga Women",
      });

      render(<CalendarAssignmentCard assignment={assignment} />);

      expect(screen.getByText("1. Liga Women")).toBeInTheDocument();
    });

    it("should not display league section when not provided", () => {
      const assignment = createMockCalendarAssignment({
        league: undefined,
      });

      render(<CalendarAssignmentCard assignment={assignment} />);

      // The league text should not be present
      expect(screen.queryByText("NLA Men")).not.toBeInTheDocument();
    });
  });

  describe("time display", () => {
    it("should display the game time", () => {
      const assignment = createMockCalendarAssignment({
        startTime: "2025-12-16T18:30:00Z",
      });

      render(<CalendarAssignmentCard assignment={assignment} />);

      // Time should be displayed in 24h format (test environment uses UTC)
      expect(screen.getByText(/18:30/)).toBeInTheDocument();
    });
  });

  describe("location display", () => {
    it("should display the address when provided", () => {
      const assignment = createMockCalendarAssignment({
        address: "Saalsporthalle, Zürich",
      });

      render(<CalendarAssignmentCard assignment={assignment} />);

      expect(screen.getByText("Saalsporthalle, Zürich")).toBeInTheDocument();
    });

    it("should not display address section when not provided", () => {
      const assignment = createMockCalendarAssignment({
        address: undefined,
      });

      render(<CalendarAssignmentCard assignment={assignment} />);

      expect(
        screen.queryByText("Saalsporthalle, Zürich"),
      ).not.toBeInTheDocument();
    });
  });

  describe("data-tour attribute", () => {
    it("should apply data-tour attribute when provided", () => {
      const assignment = createMockCalendarAssignment();

      const { container } = render(
        <CalendarAssignmentCard
          assignment={assignment}
          dataTour="assignment-card"
        />,
      );

      expect(
        container.querySelector('[data-tour="assignment-card"]'),
      ).toBeInTheDocument();
    });

    it("should not apply data-tour attribute when not provided", () => {
      const assignment = createMockCalendarAssignment();

      const { container } = render(
        <CalendarAssignmentCard assignment={assignment} />,
      );

      expect(container.querySelector("[data-tour]")).not.toBeInTheDocument();
    });
  });
});
