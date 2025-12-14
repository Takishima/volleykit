import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScorerResultsList } from "./ScorerResultsList";
import type { ValidatedPersonSearchResult } from "@/api/validation";

const mockScorers: ValidatedPersonSearchResult[] = [
  {
    __identity: "a1111111-1111-4111-a111-111111111111",
    firstName: "Hans",
    lastName: "Müller",
    displayName: "Hans Müller",
    associationId: 12345,
    birthday: "1985-03-15T00:00:00+00:00",
    gender: "m",
  },
  {
    __identity: "a2222222-2222-4222-a222-222222222222",
    firstName: "Maria",
    lastName: "Schmidt",
    displayName: "Maria Schmidt",
    associationId: 23456,
    birthday: "1990-07-22T00:00:00+00:00",
    gender: "f",
  },
];

describe("ScorerResultsList", () => {
  const defaultProps = {
    results: mockScorers,
    isLoading: false,
    isError: false,
    onSelect: vi.fn(),
  };

  it("displays loading spinner when loading", () => {
    render(<ScorerResultsList {...defaultProps} isLoading={true} />);

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("displays error message when error occurs", () => {
    render(<ScorerResultsList {...defaultProps} isError={true} />);

    const errorMessage = screen.getByText("Failed to search scorers");
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveAttribute("role", "alert");
  });

  it("displays no results message when results are empty", () => {
    render(<ScorerResultsList {...defaultProps} results={[]} />);

    expect(screen.getByText("No players found")).toBeInTheDocument();
  });

  it("displays no results message when results are undefined", () => {
    render(<ScorerResultsList {...defaultProps} results={undefined} />);

    expect(screen.getByText("No players found")).toBeInTheDocument();
  });

  it("displays list of scorers", () => {
    render(<ScorerResultsList {...defaultProps} />);

    expect(screen.getByText("Hans Müller")).toBeInTheDocument();
    expect(screen.getByText("Maria Schmidt")).toBeInTheDocument();
  });

  it("displays association IDs for scorers", () => {
    render(<ScorerResultsList {...defaultProps} />);

    expect(screen.getByText("ID: 12345")).toBeInTheDocument();
    expect(screen.getByText("ID: 23456")).toBeInTheDocument();
  });

  it("calls onSelect with scorer when clicked", () => {
    const onSelect = vi.fn();
    render(<ScorerResultsList {...defaultProps} onSelect={onSelect} />);

    const firstScorerButton = screen.getByText("Hans Müller").closest("button");
    fireEvent.click(firstScorerButton!);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockScorers[0]);
  });

  it("renders each scorer as an option with unique key", () => {
    render(<ScorerResultsList {...defaultProps} />);

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
  });
});
