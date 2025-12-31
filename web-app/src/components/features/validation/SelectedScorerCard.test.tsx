import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SelectedScorerCard } from "./SelectedScorerCard";
import type { ValidatedPersonSearchResult } from "@/api/validation";

const mockScorer: ValidatedPersonSearchResult = {
  __identity: "a1111111-1111-4111-a111-111111111111",
  firstName: "Hans",
  lastName: "Müller",
  displayName: "Hans Müller",
  associationId: 12345,
  birthday: "1985-03-15T00:00:00+00:00",
  gender: "m",
};

describe("SelectedScorerCard", () => {
  it("displays scorer name", () => {
    render(<SelectedScorerCard scorer={mockScorer} onClear={vi.fn()} />);

    expect(screen.getByText("Hans Müller")).toBeInTheDocument();
  });

  it("displays association ID", () => {
    render(<SelectedScorerCard scorer={mockScorer} onClear={vi.fn()} />);

    expect(screen.getByText("ID: 12345")).toBeInTheDocument();
  });

  it("displays formatted birthday with DOB label", () => {
    render(<SelectedScorerCard scorer={mockScorer} onClear={vi.fn()} />);

    // formatDOB returns DD.MM.YY format (Swiss format) with DOB label
    expect(screen.getByText("DOB: 15.03.85")).toBeInTheDocument();
  });

  it("calls onClear when clear button is clicked", () => {
    const onClear = vi.fn();
    render(<SelectedScorerCard scorer={mockScorer} onClear={onClear} />);

    const clearButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(clearButton);

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("does not display association ID if not present", () => {
    const scorerWithoutId = { ...mockScorer, associationId: undefined };
    render(<SelectedScorerCard scorer={scorerWithoutId} onClear={vi.fn()} />);

    expect(screen.queryByText(/ID:/)).not.toBeInTheDocument();
  });

  it("does not display birthday if not present", () => {
    const scorerWithoutBirthday = { ...mockScorer, birthday: undefined };
    render(
      <SelectedScorerCard scorer={scorerWithoutBirthday} onClear={vi.fn()} />,
    );

    expect(screen.queryByText("15.03.85")).not.toBeInTheDocument();
  });
});
