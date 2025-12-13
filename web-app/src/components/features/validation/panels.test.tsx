import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomeRosterPanel } from "./HomeRosterPanel";
import { AwayRosterPanel } from "./AwayRosterPanel";
import { ScorerPanel } from "./ScorerPanel";
import { ScoresheetPanel } from "./ScoresheetPanel";
import type { Assignment } from "@/api/client";

function createMockAssignment(
  overrides: Partial<Assignment> = {},
): Assignment {
  return {
    __identity: "assignment-1",
    refereePosition: "head-one",
    refereeGame: {
      game: {
        __identity: "game-1",
        startingDateTime: "2025-12-15T14:00:00Z",
        encounter: {
          teamHome: { name: "VBC Zürich" },
          teamAway: { name: "VBC Basel" },
        },
        hall: {
          name: "Sporthalle Zürich",
          primaryPostalAddress: {
            city: "Zürich",
          },
        },
      },
    },
    ...overrides,
  } as Assignment;
}

describe("HomeRosterPanel", () => {
  it("renders without crashing", () => {
    render(<HomeRosterPanel assignment={createMockAssignment()} />);
    expect(
      screen.getByText(
        "Home team roster verification will be available here.",
      ),
    ).toBeInTheDocument();
  });

  it("displays home team name", () => {
    render(<HomeRosterPanel assignment={createMockAssignment()} />);
    expect(screen.getByText("VBC Zürich")).toBeInTheDocument();
  });
});

describe("AwayRosterPanel", () => {
  it("renders without crashing", () => {
    render(<AwayRosterPanel assignment={createMockAssignment()} />);
    expect(
      screen.getByText(
        "Away team roster verification will be available here.",
      ),
    ).toBeInTheDocument();
  });

  it("displays away team name", () => {
    render(<AwayRosterPanel assignment={createMockAssignment()} />);
    expect(screen.getByText("VBC Basel")).toBeInTheDocument();
  });
});

describe("ScorerPanel", () => {
  it("renders without crashing", () => {
    render(<ScorerPanel assignment={createMockAssignment()} />);
    expect(
      screen.getByText("Scorer identification will be available here."),
    ).toBeInTheDocument();
  });
});

describe("ScoresheetPanel", () => {
  it("renders without crashing", () => {
    render(<ScoresheetPanel assignment={createMockAssignment()} />);
    expect(
      screen.getByText("Scoresheet upload will be available here."),
    ).toBeInTheDocument();
  });
});
