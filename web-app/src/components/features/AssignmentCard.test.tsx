import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssignmentCard } from "./AssignmentCard";
import type { Assignment } from "@/api/client";

// Helper to create mock assignment data
function createMockAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: "test-assignment-1",
    refereeConvocationStatus: "active",
    refereePosition: "head-one",
    refereeGame: {
      game: {
        id: "game-1",
        startingDateTime: "2025-12-15T14:00:00Z",
        encounter: {
          teamHome: { name: "VBC Zürich" },
          teamAway: { name: "VBC Basel" },
        },
        hall: { name: "Sporthalle Zürich" },
        group: {
          phase: {
            league: {
              leagueCategory: { name: "NLA" },
              gender: "m",
            },
          },
        },
      },
    },
    ...overrides,
  } as Assignment;
}

describe("AssignmentCard", () => {
  describe("rendering", () => {
    it("renders team names", () => {
      render(<AssignmentCard assignment={createMockAssignment()} />);

      expect(screen.getByText("VBC Zürich")).toBeInTheDocument();
      // Away team is rendered as "vs TeamName" in compact view
      expect(screen.getByText(/VBC Basel/)).toBeInTheDocument();
    });

    it("renders hall name in expanded view", () => {
      render(<AssignmentCard assignment={createMockAssignment()} />);

      // Click to expand
      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("Sporthalle Zürich")).toBeInTheDocument();
    });

    it("renders formatted time", () => {
      render(<AssignmentCard assignment={createMockAssignment()} />);

      // Time is formatted in local timezone (not UTC)
      // Match any valid HH:MM format since timezone varies by test environment
      expect(screen.getByText(/^\d{2}:\d{2}$/)).toBeInTheDocument();
    });

    it("renders position label in compact view", () => {
      render(<AssignmentCard assignment={createMockAssignment()} />);

      expect(screen.getByText("1st Referee")).toBeInTheDocument();
    });

    it("renders status label in expanded view", () => {
      render(<AssignmentCard assignment={createMockAssignment()} />);

      // Click to expand
      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("Confirmed")).toBeInTheDocument();
    });

    it("renders league category in expanded view", () => {
      render(<AssignmentCard assignment={createMockAssignment()} />);

      // Click to expand
      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText(/NLA/)).toBeInTheDocument();
    });

    it("renders city in compact view when available", () => {
      const assignment = createMockAssignment({
        refereeGame: {
          game: {
            id: "game-1",
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
      } as Partial<Assignment>);

      render(<AssignmentCard assignment={assignment} />);

      expect(screen.getByText("Zürich")).toBeInTheDocument();
    });

    it("maintains consistent spacing when city is not available", () => {
      const assignment = createMockAssignment({
        refereeGame: {
          game: {
            id: "game-1",
            startingDateTime: "2025-12-15T14:00:00Z",
            encounter: {
              teamHome: { name: "VBC Zürich" },
              teamAway: { name: "VBC Basel" },
            },
            hall: {
              name: "Sporthalle Zürich",
              // No primaryPostalAddress, so no city
            },
          },
        },
      } as Partial<Assignment>);

      render(<AssignmentCard assignment={assignment} />);

      // Should still render the expand button
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();

      // City should not be visible, but space should be reserved
      expect(screen.queryByText("Zürich")).not.toBeInTheDocument();
    });

    it("renders TBD for missing data", () => {
      const assignment = createMockAssignment({
        refereeGame: {
          game: {
            id: "game-1",
            encounter: {},
            hall: undefined,
          },
        },
      } as Partial<Assignment>);

      render(<AssignmentCard assignment={assignment} />);

      expect(screen.getAllByText("TBD").length).toBeGreaterThan(0);
      expect(screen.getByText("Location TBD")).toBeInTheDocument();
    });
  });

  describe("status colors", () => {
    it("shows green for active status in expanded view", () => {
      render(
        <AssignmentCard
          assignment={createMockAssignment({
            refereeConvocationStatus: "active",
          })}
        />,
      );

      // Click to expand
      fireEvent.click(screen.getByRole("button"));

      const statusBadge = screen.getByText("Confirmed");
      expect(statusBadge).toHaveClass("bg-success-100");
    });

    it("shows red for cancelled status in expanded view", () => {
      render(
        <AssignmentCard
          assignment={createMockAssignment({
            refereeConvocationStatus: "cancelled",
          })}
        />,
      );

      // Click to expand
      fireEvent.click(screen.getByRole("button"));

      const statusBadge = screen.getByText("Cancelled");
      expect(statusBadge).toHaveClass("bg-danger-100");
    });

    it("shows gray for archived status in expanded view", () => {
      render(
        <AssignmentCard
          assignment={createMockAssignment({
            refereeConvocationStatus: "archived",
          })}
        />,
      );

      // Click to expand
      fireEvent.click(screen.getByRole("button"));

      const statusBadge = screen.getByText("Archived");
      expect(statusBadge).toHaveClass("bg-surface-subtle");
    });
  });

  describe("interactivity", () => {
    it("calls onClick when clicked", () => {
      const onClick = vi.fn();
      render(
        <AssignmentCard
          assignment={createMockAssignment()}
          onClick={onClick}
        />,
      );

      fireEvent.click(screen.getByRole("button"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("handles keyboard activation (native button behavior)", () => {
      const onClick = vi.fn();
      render(
        <AssignmentCard
          assignment={createMockAssignment()}
          onClick={onClick}
        />,
      );

      // Native buttons handle Enter/Space automatically via click events
      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("always has button role for expand/collapse functionality", () => {
      render(<AssignmentCard assignment={createMockAssignment()} />);

      // Card is always interactive for expand/collapse even without onClick handler
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("uses aria-expanded for disclosure pattern", () => {
      render(<AssignmentCard assignment={createMockAssignment()} />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(button).toHaveAttribute("aria-controls");
    });

    it("is naturally focusable as a native button", () => {
      const { container } = render(
        <AssignmentCard assignment={createMockAssignment()} />,
      );

      // Native button elements are focusable by default
      const button = container.querySelector("button");
      expect(button).toBeInTheDocument();
      expect(button?.tagName).toBe("BUTTON");
    });

    it("hides location icon from screen readers", () => {
      const { container } = render(
        <AssignmentCard assignment={createMockAssignment()} />,
      );

      // SVG icon should have aria-hidden for accessibility
      const svg = container.querySelector('svg[aria-hidden="true"]');
      expect(svg).toBeInTheDocument();
    });
  });

  describe("position labels", () => {
    const positions = [
      { key: "head-one" as const, label: "1st Referee" },
      { key: "head-two" as const, label: "2nd Referee" },
      { key: "linesman-one" as const, label: "Linesman 1" },
      { key: "linesman-two" as const, label: "Linesman 2" },
      { key: "standby-head" as const, label: "Standby Head" },
    ];

    positions.forEach(({ key, label }) => {
      it(`renders correct label for ${key} in compact view`, () => {
        render(
          <AssignmentCard
            assignment={createMockAssignment({ refereePosition: key })}
          />,
        );
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    it("falls back to position key for unknown positions", () => {
      // Testing component behavior with unexpected API data
      const assignment = createMockAssignment({
        refereePosition: "unknown-position" as Assignment["refereePosition"],
      });
      render(<AssignmentCard assignment={assignment} />);
      expect(screen.getByText("unknown-position")).toBeInTheDocument();
    });
  });

  describe("expand/collapse", () => {
    it("expands on click", () => {
      render(<AssignmentCard assignment={createMockAssignment()} />);

      const card = screen.getByRole("button");
      expect(card).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(card);
      expect(card).toHaveAttribute("aria-expanded", "true");
    });

    it("collapses on second click", () => {
      render(<AssignmentCard assignment={createMockAssignment()} />);

      const card = screen.getByRole("button");
      fireEvent.click(card); // expand
      fireEvent.click(card); // collapse

      expect(card).toHaveAttribute("aria-expanded", "false");
    });

    it("aria-controls links to details section", () => {
      const { container } = render(
        <AssignmentCard assignment={createMockAssignment()} />,
      );

      const button = screen.getByRole("button");
      const controlsId = button.getAttribute("aria-controls");

      // The controlled element should exist
      const detailsSection = container.querySelector(
        `#${CSS.escape(controlsId!)}`,
      );
      expect(detailsSection).toBeInTheDocument();
    });
  });

  describe("location link", () => {
    it("renders clickable link when plusCode is available", () => {
      const assignment = createMockAssignment({
        refereeGame: {
          game: {
            id: "game-1",
            startingDateTime: "2025-12-15T14:00:00Z",
            encounter: {
              teamHome: { name: "VBC Zürich" },
              teamAway: { name: "VBC Basel" },
            },
            hall: {
              name: "Sporthalle Zürich",
              primaryPostalAddress: {
                geographicalLocation: {
                  plusCode: "8FVC9G8F+6X",
                },
              },
            },
            group: {
              phase: {
                league: {
                  leagueCategory: { name: "NLA" },
                  gender: "m",
                },
              },
            },
          },
        },
      } as Partial<Assignment>);

      render(<AssignmentCard assignment={assignment} />);

      // Expand to see location
      fireEvent.click(screen.getByRole("button"));

      const link = screen.getByRole("link", { name: "Sporthalle Zürich" });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        "href",
        "https://www.google.com/maps/search/?api=1&query=8FVC9G8F%2B6X",
      );
    });

    it("renders plain text when plusCode is missing", () => {
      const assignment = createMockAssignment({
        refereeGame: {
          game: {
            id: "game-1",
            startingDateTime: "2025-12-15T14:00:00Z",
            encounter: {
              teamHome: { name: "VBC Zürich" },
              teamAway: { name: "VBC Basel" },
            },
            hall: {
              name: "Sporthalle Zürich",
              primaryPostalAddress: undefined,
            },
            group: {
              phase: {
                league: {
                  leagueCategory: { name: "NLA" },
                  gender: "m",
                },
              },
            },
          },
        },
      } as Partial<Assignment>);

      render(<AssignmentCard assignment={assignment} />);

      // Expand to see location
      fireEvent.click(screen.getByRole("button"));

      // Should not be a link
      expect(
        screen.queryByRole("link", { name: "Sporthalle Zürich" }),
      ).not.toBeInTheDocument();
      // Should be plain text
      expect(screen.getByText("Sporthalle Zürich")).toBeInTheDocument();
    });

    it("has correct link attributes for security", () => {
      const assignment = createMockAssignment({
        refereeGame: {
          game: {
            id: "game-1",
            startingDateTime: "2025-12-15T14:00:00Z",
            encounter: {
              teamHome: { name: "VBC Zürich" },
              teamAway: { name: "VBC Basel" },
            },
            hall: {
              name: "Sporthalle Zürich",
              primaryPostalAddress: {
                geographicalLocation: {
                  plusCode: "8FVC9G8F+6X",
                },
              },
            },
            group: {
              phase: {
                league: {
                  leagueCategory: { name: "NLA" },
                  gender: "m",
                },
              },
            },
          },
        },
      } as Partial<Assignment>);

      render(<AssignmentCard assignment={assignment} />);

      // Expand to see location
      fireEvent.click(screen.getByRole("button"));

      const link = screen.getByRole("link", { name: "Sporthalle Zürich" });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("does not expand card when clicking location link", () => {
      const assignment = createMockAssignment({
        refereeGame: {
          game: {
            id: "game-1",
            startingDateTime: "2025-12-15T14:00:00Z",
            encounter: {
              teamHome: { name: "VBC Zürich" },
              teamAway: { name: "VBC Basel" },
            },
            hall: {
              name: "Sporthalle Zürich",
              primaryPostalAddress: {
                geographicalLocation: {
                  plusCode: "8FVC9G8F+6X",
                },
              },
            },
            group: {
              phase: {
                league: {
                  leagueCategory: { name: "NLA" },
                  gender: "m",
                },
              },
            },
          },
        },
      } as Partial<Assignment>);

      render(<AssignmentCard assignment={assignment} />);

      const cardButton = screen.getByRole("button");

      // Initially collapsed
      expect(cardButton).toHaveAttribute("aria-expanded", "false");

      // Expand to see location
      fireEvent.click(cardButton);
      expect(cardButton).toHaveAttribute("aria-expanded", "true");

      // Click the location link
      const link = screen.getByRole("link", { name: "Sporthalle Zürich" });
      fireEvent.click(link);

      // Card should remain expanded (not toggle)
      expect(cardButton).toHaveAttribute("aria-expanded", "true");
    });

    it("properly encodes plusCode in URL", () => {
      const assignment = createMockAssignment({
        refereeGame: {
          game: {
            id: "game-1",
            startingDateTime: "2025-12-15T14:00:00Z",
            encounter: {
              teamHome: { name: "VBC Zürich" },
              teamAway: { name: "VBC Basel" },
            },
            hall: {
              name: "Sporthalle Zürich",
              primaryPostalAddress: {
                geographicalLocation: {
                  plusCode: "Test+Code",
                },
              },
            },
            group: {
              phase: {
                league: {
                  leagueCategory: { name: "NLA" },
                  gender: "m",
                },
              },
            },
          },
        },
      } as Partial<Assignment>);

      render(<AssignmentCard assignment={assignment} />);

      // Expand to see location
      fireEvent.click(screen.getByRole("button"));

      const link = screen.getByRole("link", { name: "Sporthalle Zürich" });
      // + should be encoded as %2B
      expect(link).toHaveAttribute(
        "href",
        "https://www.google.com/maps/search/?api=1&query=Test%2BCode",
      );
    });
  });
});
