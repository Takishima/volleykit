import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ScorerSearchPanel } from "./ScorerSearchPanel";
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
    lastName: "Müller",
    displayName: "Maria Müller",
    associationId: 12346,
    birthday: "1990-07-22T00:00:00+00:00",
    gender: "f",
  },
  {
    __identity: "a3333333-3333-4333-a333-333333333333",
    firstName: "Peter",
    lastName: "Schmidt",
    displayName: "Peter Schmidt",
    associationId: 23456,
    birthday: "1978-11-08T00:00:00+00:00",
    gender: "m",
  },
];

vi.mock("@/hooks/useScorerSearch", () => ({
  useScorerSearch: vi.fn(() => ({
    data: mockScorers,
    isLoading: false,
    isError: false,
    error: null,
  })),
  parseSearchInput: vi.fn((input: string) => {
    if (!input.trim()) return {};
    return { lastName: input };
  }),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn((selector) => selector({ dataSource: "api" })),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// Debounce delay used in ScorerSearchPanel component
const SEARCH_DEBOUNCE_MS = 300;

describe("ScorerSearchPanel", () => {
  const defaultProps = {
    selectedScorer: null,
    onScorerSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders search input when no scorer is selected", () => {
    render(<ScorerSearchPanel {...defaultProps} />, {
      wrapper: createWrapper(),
    });
    expect(
      screen.getByPlaceholderText("Search scorer by name..."),
    ).toBeInTheDocument();
  });

  it("displays search hint text", () => {
    render(<ScorerSearchPanel {...defaultProps} />, {
      wrapper: createWrapper(),
    });
    expect(
      screen.getByText(/Enter name.*or add birth year/i),
    ).toBeInTheDocument();
  });

  it("shows 'no scorer selected' message when empty and not searching", () => {
    render(<ScorerSearchPanel {...defaultProps} />, {
      wrapper: createWrapper(),
    });
    expect(screen.getByText(/No scorer selected/i)).toBeInTheDocument();
  });

  it("displays search results when query is entered", async () => {
    render(<ScorerSearchPanel {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(screen.getByText("Hans Müller")).toBeInTheDocument();
    expect(screen.getByText("Maria Müller")).toBeInTheDocument();
  });

  it("displays association ID in search results", async () => {
    render(<ScorerSearchPanel {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(screen.getByText("ID: 12345")).toBeInTheDocument();
  });

  it("calls onScorerSelect when a scorer is clicked", async () => {
    const onScorerSelect = vi.fn();
    render(
      <ScorerSearchPanel {...defaultProps} onScorerSelect={onScorerSelect} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    const scorerButton = screen.getByText("Hans Müller").closest("button");
    fireEvent.click(scorerButton!);

    expect(onScorerSelect).toHaveBeenCalledTimes(1);
    expect(onScorerSelect).toHaveBeenCalledWith(mockScorers[0]);
  });

  it("displays selected scorer when one is provided", () => {
    render(
      <ScorerSearchPanel {...defaultProps} selectedScorer={mockScorers[0]} />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("Hans Müller")).toBeInTheDocument();
    expect(screen.getByText("ID: 12345")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Search scorer by name..."),
    ).not.toBeInTheDocument();
  });

  it("calls onScorerSelect with null when clear button is clicked", () => {
    const onScorerSelect = vi.fn();
    render(
      <ScorerSearchPanel
        {...defaultProps}
        selectedScorer={mockScorers[0]}
        onScorerSelect={onScorerSelect}
      />,
      { wrapper: createWrapper() },
    );

    const clearButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(clearButton);

    expect(onScorerSelect).toHaveBeenCalledWith(null);
  });

  it("clears search input when scorer is selected", async () => {
    const onScorerSelect = vi.fn();
    render(
      <ScorerSearchPanel {...defaultProps} onScorerSelect={onScorerSelect} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText(
      "Search scorer by name...",
    ) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    const scorerButton = screen.getByText("Hans Müller").closest("button");
    fireEvent.click(scorerButton!);

    // After selecting, the search input should be cleared
    expect(searchInput.value).toBe("");
  });
});

describe("ScorerSearchPanel - Loading State", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows loading spinner when search is loading", async () => {
    const { useScorerSearch } = await import("@/hooks/useScorerSearch");
    vi.mocked(useScorerSearch).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });
});

describe("ScorerSearchPanel - Error State", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows error message when search fails", async () => {
    const { useScorerSearch } = await import("@/hooks/useScorerSearch");
    vi.mocked(useScorerSearch).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Search failed"),
    });

    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const errorMessage = screen.getByText("Failed to search scorers");
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveAttribute("role", "alert");
  });
});

describe("ScorerSearchPanel - Empty Results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows no results message when search returns empty", async () => {
    const { useScorerSearch } = await import("@/hooks/useScorerSearch");
    vi.mocked(useScorerSearch).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });

    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "XYZ" } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText("No scorers found")).toBeInTheDocument();
  });
});

describe("ScorerSearchPanel - Keyboard Navigation", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    const { useScorerSearch } = await import("@/hooks/useScorerSearch");
    vi.mocked(useScorerSearch).mockReturnValue({
      data: mockScorers,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("navigates down with ArrowDown key", async () => {
    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    fireEvent.keyDown(searchInput, { key: "ArrowDown" });

    const firstOption = screen.getByRole("option", { name: /Hans Müller/i });
    expect(firstOption).toHaveAttribute("aria-selected", "true");
  });

  it("navigates up with ArrowUp key", async () => {
    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    fireEvent.keyDown(searchInput, { key: "ArrowDown" });
    fireEvent.keyDown(searchInput, { key: "ArrowDown" });
    fireEvent.keyDown(searchInput, { key: "ArrowUp" });

    const firstOption = screen.getByRole("option", { name: /Hans Müller/i });
    expect(firstOption).toHaveAttribute("aria-selected", "true");
  });

  it("selects highlighted item with Enter key", async () => {
    const onScorerSelect = vi.fn();
    render(
      <ScorerSearchPanel
        selectedScorer={null}
        onScorerSelect={onScorerSelect}
      />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    fireEvent.keyDown(searchInput, { key: "ArrowDown" });
    fireEvent.keyDown(searchInput, { key: "Enter" });

    expect(onScorerSelect).toHaveBeenCalledWith(mockScorers[0]);
  });

  it("does not call onScorerSelect when Enter is pressed without highlight", async () => {
    const onScorerSelect = vi.fn();
    render(
      <ScorerSearchPanel
        selectedScorer={null}
        onScorerSelect={onScorerSelect}
      />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    // Press Enter without navigating to any item
    fireEvent.keyDown(searchInput, { key: "Enter" });

    expect(onScorerSelect).not.toHaveBeenCalled();
  });

  it("clears highlight with Escape key", async () => {
    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    fireEvent.keyDown(searchInput, { key: "ArrowDown" });
    fireEvent.keyDown(searchInput, { key: "Escape" });

    const options = screen.getAllByRole("option");
    options.forEach((option) => {
      expect(option).toHaveAttribute("aria-selected", "false");
    });
  });

  it("navigates to first item with Home key", async () => {
    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    fireEvent.keyDown(searchInput, { key: "ArrowDown" });
    fireEvent.keyDown(searchInput, { key: "ArrowDown" });
    fireEvent.keyDown(searchInput, { key: "Home" });

    const firstOption = screen.getByRole("option", { name: /Hans Müller/i });
    expect(firstOption).toHaveAttribute("aria-selected", "true");
  });

  it("navigates to last item with End key", async () => {
    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    fireEvent.keyDown(searchInput, { key: "End" });

    const lastOption = screen.getByRole("option", { name: /Peter Schmidt/i });
    expect(lastOption).toHaveAttribute("aria-selected", "true");
  });

  it("resets highlight when search query changes", async () => {
    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    fireEvent.keyDown(searchInput, { key: "ArrowDown" });

    fireEvent.change(searchInput, { target: { value: "Schmidt" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    const options = screen.getAllByRole("option");
    options.forEach((option) => {
      expect(option).toHaveAttribute("aria-selected", "false");
    });
  });

  it("resets highlight when clearing scorer", async () => {
    const onScorerSelect = vi.fn();
    const { rerender } = render(
      <ScorerSearchPanel
        selectedScorer={mockScorers[0]}
        onScorerSelect={onScorerSelect}
      />,
      { wrapper: createWrapper() },
    );

    const clearButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(clearButton);

    rerender(
      <ScorerSearchPanel
        selectedScorer={null}
        onScorerSelect={onScorerSelect}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    const options = screen.getAllByRole("option");
    options.forEach((option) => {
      expect(option).toHaveAttribute("aria-selected", "false");
    });
  });
});

describe("ScorerSearchPanel - Screen Reader Announcements", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    const { useScorerSearch } = await import("@/hooks/useScorerSearch");
    vi.mocked(useScorerSearch).mockReturnValue({
      data: mockScorers,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("has aria-live region for announcements", () => {
    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
    expect(liveRegion).toHaveClass("sr-only");
  });

  it("announces result count when results are shown (plural)", async () => {
    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toHaveTextContent("3 results found");
  });

  it("announces singular result count", async () => {
    const { useScorerSearch } = await import("@/hooks/useScorerSearch");
    vi.mocked(useScorerSearch).mockReturnValue({
      data: [mockScorers[0]!],
      isLoading: false,
      isError: false,
      error: null,
    });

    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Hans" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toHaveTextContent("1 result found");
  });

  it("does not announce when loading", async () => {
    const { useScorerSearch } = await import("@/hooks/useScorerSearch");
    vi.mocked(useScorerSearch).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeEmptyDOMElement();
  });

  it("does not announce when error occurs", async () => {
    const { useScorerSearch } = await import("@/hooks/useScorerSearch");
    vi.mocked(useScorerSearch).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Search failed"),
    });

    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeEmptyDOMElement();
  });

  it("announces zero results found", async () => {
    const { useScorerSearch } = await import("@/hooks/useScorerSearch");
    vi.mocked(useScorerSearch).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });

    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "XYZ" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toHaveTextContent("0 results found");
  });
});

describe("ScorerSearchPanel - ARIA Attributes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    const { useScorerSearch } = await import("@/hooks/useScorerSearch");
    vi.mocked(useScorerSearch).mockReturnValue({
      data: mockScorers,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("has combobox role on search input", () => {
    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByRole("combobox");
    expect(searchInput).toBeInTheDocument();
  });

  it("links search input to hint text via aria-describedby", () => {
    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByRole("combobox");
    const hintText = screen.getByText(/Enter name.*or add birth year/i);

    expect(hintText).toHaveAttribute("id");
    expect(searchInput).toHaveAttribute(
      "aria-describedby",
      hintText.getAttribute("id"),
    );
  });

  it("has listbox role on results list", async () => {
    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();
  });

  it("has option role on each result item", async () => {
    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    const options = screen.getAllByRole("option");
    expect(options.length).toBe(mockScorers.length);
  });

  it("sets aria-expanded to true when results are shown", async () => {
    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByRole("combobox");
    expect(searchInput).toHaveAttribute("aria-expanded", "false");

    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(searchInput).toHaveAttribute("aria-expanded", "true");
  });

  it("updates aria-activedescendant on keyboard navigation", async () => {
    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByRole("combobox");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(searchInput).not.toHaveAttribute("aria-activedescendant");

    fireEvent.keyDown(searchInput, { key: "ArrowDown" });

    expect(searchInput).toHaveAttribute("aria-activedescendant");
    expect(searchInput.getAttribute("aria-activedescendant")).toContain(
      mockScorers[0]!.__identity,
    );
  });

  it("highlights item on mouse enter", async () => {
    render(
      <ScorerSearchPanel selectedScorer={null} onScorerSelect={vi.fn()} />,
      { wrapper: createWrapper() },
    );

    const searchInput = screen.getByPlaceholderText("Search scorer by name...");
    fireEvent.change(searchInput, { target: { value: "Müller" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    const secondOption = screen.getByRole("option", { name: /Maria Müller/i });
    const button = secondOption.querySelector("button")!;
    fireEvent.mouseEnter(button);

    expect(secondOption).toHaveAttribute("aria-selected", "true");
  });
});
