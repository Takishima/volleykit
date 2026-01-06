import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScorerPanel } from "./ScorerPanel";
import type { ValidatedPersonSearchResult } from "@/api/validation";

// Mock useTranslation hook
vi.mock("@/shared/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "validation.scorer.title": "Scorer",
        "validation.scorer.searchPlaceholder": "Search for scorer...",
        "validation.scorer.noResults": "No scorers found",
        "validation.scorer.selected": "Selected scorer",
        "validation.scorer.readOnly": "Scorer (read-only)",
        "common.clear": "Clear",
      };
      return translations[key] || key;
    },
  }),
}));

// Mock ScorerSearchPanel component
const mockOnScorerSelect = vi.fn();
vi.mock("./ScorerSearchPanel", () => ({
  ScorerSearchPanel: ({
    selectedScorer,
    onScorerSelect,
    readOnly,
    readOnlyScorerName,
  }: {
    selectedScorer: ValidatedPersonSearchResult | null;
    onScorerSelect: (scorer: ValidatedPersonSearchResult | null) => void;
    readOnly: boolean;
    readOnlyScorerName?: string;
  }) => {
    // Store the callback for testing
    mockOnScorerSelect.mockImplementation(onScorerSelect);

    return (
      <div data-testid="scorer-search-panel">
        <div data-testid="read-only">{String(readOnly)}</div>
        <div data-testid="selected-scorer">
          {selectedScorer?.displayName || "none"}
        </div>
        {readOnlyScorerName && (
          <div data-testid="read-only-scorer-name">{readOnlyScorerName}</div>
        )}
        <button
          data-testid="select-scorer-btn"
          onClick={() =>
            onScorerSelect({
              __identity: "new-scorer-id",
              displayName: "New Scorer",
            })
          }
        >
          Select New Scorer
        </button>
        <button
          data-testid="clear-scorer-btn"
          onClick={() => onScorerSelect(null)}
        >
          Clear Scorer
        </button>
      </div>
    );
  },
}));

describe("ScorerPanel", () => {
  const mockScorer: ValidatedPersonSearchResult = {
    __identity: "scorer-123",
    displayName: "Max Mustermann",
    firstName: "Max",
    lastName: "Mustermann",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders ScorerSearchPanel", () => {
    render(<ScorerPanel />);

    expect(screen.getByTestId("scorer-search-panel")).toBeInTheDocument();
  });

  it("passes readOnly prop to ScorerSearchPanel", () => {
    render(<ScorerPanel readOnly={true} />);

    expect(screen.getByTestId("read-only")).toHaveTextContent("true");
  });

  it("passes readOnlyScorerName to ScorerSearchPanel", () => {
    render(
      <ScorerPanel readOnly={true} readOnlyScorerName="Existing Scorer" />
    );

    expect(screen.getByTestId("read-only-scorer-name")).toHaveTextContent(
      "Existing Scorer"
    );
  });

  it("initializes with null selected scorer by default", () => {
    render(<ScorerPanel />);

    expect(screen.getByTestId("selected-scorer")).toHaveTextContent("none");
  });

  it("initializes with provided initialScorer", () => {
    render(<ScorerPanel initialScorer={mockScorer} />);

    expect(screen.getByTestId("selected-scorer")).toHaveTextContent(
      "Max Mustermann"
    );
  });

  it("calls onScorerChange with initialScorer on mount", async () => {
    const onScorerChange = vi.fn();

    render(
      <ScorerPanel initialScorer={mockScorer} onScorerChange={onScorerChange} />
    );

    await waitFor(() => {
      expect(onScorerChange).toHaveBeenCalledWith(mockScorer);
    });
  });

  it("does not call onScorerChange on mount when no initialScorer", () => {
    const onScorerChange = vi.fn();

    render(<ScorerPanel onScorerChange={onScorerChange} />);

    expect(onScorerChange).not.toHaveBeenCalled();
  });

  it("updates selected scorer when a new scorer is selected", async () => {
    const onScorerChange = vi.fn();
    const user = userEvent.setup();

    render(<ScorerPanel onScorerChange={onScorerChange} />);

    await user.click(screen.getByTestId("select-scorer-btn"));

    expect(onScorerChange).toHaveBeenCalledWith({
      __identity: "new-scorer-id",
      displayName: "New Scorer",
    });
  });

  it("clears selected scorer when clear is triggered", async () => {
    const onScorerChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ScorerPanel initialScorer={mockScorer} onScorerChange={onScorerChange} />
    );

    // Clear the initial call
    onScorerChange.mockClear();

    await user.click(screen.getByTestId("clear-scorer-btn"));

    expect(onScorerChange).toHaveBeenCalledWith(null);
  });

  it("maintains internal state when no onScorerChange is provided", async () => {
    const user = userEvent.setup();

    render(<ScorerPanel />);

    expect(screen.getByTestId("selected-scorer")).toHaveTextContent("none");

    await user.click(screen.getByTestId("select-scorer-btn"));

    // Component should update internal state even without callback
    expect(screen.getByTestId("selected-scorer")).toHaveTextContent(
      "New Scorer"
    );
  });
});
