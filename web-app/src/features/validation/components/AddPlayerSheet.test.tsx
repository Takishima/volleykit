import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AddPlayerSheet } from "./AddPlayerSheet";
import type { PossibleNomination } from "@/api/client";

const mockPlayers: PossibleNomination[] = [
  {
    __identity: "player-1",
    indoorPlayer: {
      __identity: "indoor-1",
      person: {
        __identity: "person-1",
        displayName: "Müller Max",
        firstName: "Max",
        lastName: "Müller",
        birthday: "1990-05-15",
      },
    },
    licenseCategory: "SEN",
    isAlreadyNominated: false,
  },
  {
    __identity: "player-2",
    indoorPlayer: {
      __identity: "indoor-2",
      person: {
        __identity: "person-2",
        displayName: "Schmidt Anna",
        firstName: "Anna",
        lastName: "Schmidt",
        birthday: "1995-08-22",
      },
    },
    licenseCategory: "JUN",
    isAlreadyNominated: false,
  },
  {
    __identity: "player-3",
    indoorPlayer: {
      __identity: "indoor-3",
      person: {
        __identity: "person-3",
        displayName: "Weber Thomas",
        firstName: "Thomas",
        lastName: "Weber",
        birthday: "1988-12-01",
      },
    },
    licenseCategory: "SEN",
    isAlreadyNominated: true,
  },
];

vi.mock("@/features/validation/hooks/usePlayerNominations", () => ({
  usePossiblePlayerNominations: vi.fn(() => ({
    data: mockPlayers,
    isLoading: false,
    isError: false,
  })),
}));

vi.mock("@/shared/stores/auth", () => ({
  useAuthStore: vi.fn((selector) =>
    selector({ dataSource: "api" }),
  ),
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

// Debounce delay used in AddPlayerSheet component
const SEARCH_DEBOUNCE_MS = 200;

describe("AddPlayerSheet", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    nominationListId: "nomination-123",
    excludePlayerIds: [],
    onAddPlayer: vi.fn(),
    onRemovePlayer: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders when isOpen is true", () => {
    render(<AddPlayerSheet {...defaultProps} />, { wrapper: createWrapper() });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Add Player")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(<AddPlayerSheet {...defaultProps} isOpen={false} />, {
      wrapper: createWrapper(),
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("displays player list with aligned columns", () => {
    render(<AddPlayerSheet {...defaultProps} />, { wrapper: createWrapper() });
    // Players are shown in aligned columns: LastName | Initial | DOB
    expect(screen.getByText("Müller")).toBeInTheDocument();
    expect(screen.getByText("M.")).toBeInTheDocument();
    expect(screen.getByText("15.05.90")).toBeInTheDocument();
    expect(screen.getByText("Schmidt")).toBeInTheDocument();
    expect(screen.getByText("A.")).toBeInTheDocument();
    expect(screen.getByText("22.08.95")).toBeInTheDocument();
  });

  it("filters out already nominated players", () => {
    render(<AddPlayerSheet {...defaultProps} />, { wrapper: createWrapper() });
    expect(screen.getByText("Müller")).toBeInTheDocument();
    // Weber Thomas is already nominated, so should not appear
    expect(screen.queryByText("Weber")).not.toBeInTheDocument();
  });

  it("filters out excluded players", () => {
    render(
      <AddPlayerSheet {...defaultProps} excludePlayerIds={["indoor-1"]} />,
      { wrapper: createWrapper() },
    );
    expect(screen.queryByText("Müller")).not.toBeInTheDocument();
    expect(screen.getByText("Schmidt")).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<AddPlayerSheet {...defaultProps} onClose={onClose} />, {
      wrapper: createWrapper(),
    });

    const backdrop = document.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when dialog content is clicked", () => {
    const onClose = vi.fn();
    render(<AddPlayerSheet {...defaultProps} onClose={onClose} />, {
      wrapper: createWrapper(),
    });

    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<AddPlayerSheet {...defaultProps} onClose={onClose} />, {
      wrapper: createWrapper(),
    });

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(<AddPlayerSheet {...defaultProps} onClose={onClose} />, {
      wrapper: createWrapper(),
    });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("filters players based on search input", () => {
    render(<AddPlayerSheet {...defaultProps} />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText("Search players...");
    fireEvent.change(searchInput, { target: { value: "Anna" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(screen.getByText("Schmidt")).toBeInTheDocument();
    expect(screen.queryByText("Müller")).not.toBeInTheDocument();
  });

  it("performs case-insensitive search", () => {
    render(<AddPlayerSheet {...defaultProps} />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText("Search players...");
    fireEvent.change(searchInput, { target: { value: "ANNA" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(screen.getByText("Schmidt")).toBeInTheDocument();
  });

  it("shows no results message when search has no matches", () => {
    render(<AddPlayerSheet {...defaultProps} />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText("Search players...");
    fireEvent.change(searchInput, { target: { value: "XYZ NonExistent" } });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(screen.getByText("No players found")).toBeInTheDocument();
  });

  it("clears search query when close button is clicked", () => {
    const onClose = vi.fn();
    render(<AddPlayerSheet {...defaultProps} onClose={onClose} />, {
      wrapper: createWrapper(),
    });

    const searchInput = screen.getByPlaceholderText("Search players...");
    fireEvent.change(searchInput, { target: { value: "Anna" } });
    expect(searchInput).toHaveValue("Anna");

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(searchInput).toHaveValue("");
  });

  it("calls onAddPlayer when a player is selected", () => {
    const onAddPlayer = vi.fn();
    render(<AddPlayerSheet {...defaultProps} onAddPlayer={onAddPlayer} />, {
      wrapper: createWrapper(),
    });

    const playerButton = screen.getByText("Müller").closest("button");
    fireEvent.click(playerButton!);

    expect(onAddPlayer).toHaveBeenCalledTimes(1);
    expect(onAddPlayer).toHaveBeenCalledWith(mockPlayers[0]);
  });

  it("displays player info in aligned columns with date of birth", () => {
    render(<AddPlayerSheet {...defaultProps} />, { wrapper: createWrapper() });
    // Players are displayed in aligned columns
    expect(screen.getByText("Müller")).toBeInTheDocument();
    expect(screen.getByText("15.05.90")).toBeInTheDocument();
    expect(screen.getByText("Schmidt")).toBeInTheDocument();
    expect(screen.getByText("22.08.95")).toBeInTheDocument();
  });

  it("has proper accessibility attributes", () => {
    render(<AddPlayerSheet {...defaultProps} />, { wrapper: createWrapper() });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "add-player-title");

    const searchInput = screen.getByPlaceholderText("Search players...");
    expect(searchInput).toHaveAttribute("aria-label", "Search players...");
  });
});

describe("AddPlayerSheet - Loading State", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading spinner when data is loading", async () => {
    const { usePossiblePlayerNominations } = await import(
      "@/features/validation/hooks/usePlayerNominations"
    );
    vi.mocked(usePossiblePlayerNominations).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof usePossiblePlayerNominations>);

    render(
      <AddPlayerSheet
        isOpen={true}
        onClose={vi.fn()}
        nominationListId="nomination-123"
        excludePlayerIds={[]}
        onAddPlayer={vi.fn()}
        onRemovePlayer={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    expect(
      document.querySelector(".animate-spin"),
    ).toBeInTheDocument();
  });
});

describe("AddPlayerSheet - Error State", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows error message when data fetch fails", async () => {
    const { usePossiblePlayerNominations } = await import(
      "@/features/validation/hooks/usePlayerNominations"
    );
    vi.mocked(usePossiblePlayerNominations).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof usePossiblePlayerNominations>);

    render(
      <AddPlayerSheet
        isOpen={true}
        onClose={vi.fn()}
        nominationListId="nomination-123"
        excludePlayerIds={[]}
        onAddPlayer={vi.fn()}
        onRemovePlayer={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    const errorMessage = screen.getByText("Failed to load players");
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveAttribute("role", "alert");
  });
});

describe("AddPlayerSheet - Multi-Player Selection", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    nominationListId: "nomination-123",
    excludePlayerIds: [] as string[],
    onAddPlayer: vi.fn(),
    onRemovePlayer: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset mock to return proper data (in case previous test changed it)
    const { usePossiblePlayerNominations } = await import(
      "@/features/validation/hooks/usePlayerNominations"
    );
    vi.mocked(usePossiblePlayerNominations).mockReturnValue({
      data: mockPlayers,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof usePossiblePlayerNominations>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps modal open after adding a player", () => {
    const onClose = vi.fn();
    render(<AddPlayerSheet {...defaultProps} onClose={onClose} />, {
      wrapper: createWrapper(),
    });

    const playerButton = screen.getByText("Müller").closest("button");
    fireEvent.click(playerButton!);

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows checkmark on added player", () => {
    render(<AddPlayerSheet {...defaultProps} />, { wrapper: createWrapper() });

    const playerButton = screen.getByText("Müller").closest("button");
    fireEvent.click(playerButton!);

    expect(playerButton).toHaveAttribute("aria-pressed", "true");
    // Button is still enabled to allow toggling (removal)
    expect(playerButton).toBeEnabled();
  });

  it("displays counter badge with number of added players", () => {
    render(<AddPlayerSheet {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.queryByText(/added/i)).not.toBeInTheDocument();

    const maxButton = screen.getByText("Müller").closest("button");
    fireEvent.click(maxButton!);

    expect(screen.getByText("1 added")).toBeInTheDocument();

    const annaButton = screen.getByText("Schmidt").closest("button");
    fireEvent.click(annaButton!);

    expect(screen.getByText("2 added")).toBeInTheDocument();
  });

  it("allows adding multiple players", () => {
    const onAddPlayer = vi.fn();
    render(<AddPlayerSheet {...defaultProps} onAddPlayer={onAddPlayer} />, {
      wrapper: createWrapper(),
    });

    const maxButton = screen.getByText("Müller").closest("button");
    fireEvent.click(maxButton!);

    const annaButton = screen.getByText("Schmidt").closest("button");
    fireEvent.click(annaButton!);

    expect(onAddPlayer).toHaveBeenCalledTimes(2);
    expect(onAddPlayer).toHaveBeenNthCalledWith(1, mockPlayers[0]);
    expect(onAddPlayer).toHaveBeenNthCalledWith(2, mockPlayers[1]);
  });

  it("toggles player selection on repeated clicks", () => {
    const onAddPlayer = vi.fn();
    const onRemovePlayer = vi.fn();
    render(
      <AddPlayerSheet
        {...defaultProps}
        onAddPlayer={onAddPlayer}
        onRemovePlayer={onRemovePlayer}
      />,
      { wrapper: createWrapper() },
    );

    const playerButton = screen.getByText("Müller").closest("button");

    // First click adds
    fireEvent.click(playerButton!);
    expect(onAddPlayer).toHaveBeenCalledTimes(1);
    expect(playerButton).toHaveAttribute("aria-pressed", "true");

    // Second click removes
    fireEvent.click(playerButton!);
    expect(onRemovePlayer).toHaveBeenCalledTimes(1);
    expect(onRemovePlayer).toHaveBeenCalledWith("indoor-1");
    expect(playerButton).toHaveAttribute("aria-pressed", "false");

    // Third click adds again
    fireEvent.click(playerButton!);
    expect(onAddPlayer).toHaveBeenCalledTimes(2);
  });

  it("resets session when modal is closed", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <AddPlayerSheet {...defaultProps} onClose={onClose} />,
      { wrapper: createWrapper() },
    );

    const playerButton = screen.getByText("Müller").closest("button");
    fireEvent.click(playerButton!);

    expect(screen.getByText("1 added")).toBeInTheDocument();

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    rerender(<AddPlayerSheet {...defaultProps} onClose={onClose} isOpen={true} />);

    expect(screen.queryByText(/added/i)).not.toBeInTheDocument();
    const newPlayerButton = screen.getByText("Müller").closest("button");
    expect(newPlayerButton).not.toBeDisabled();
  });

  it("keeps session-added players visible even when in excludePlayerIds", () => {
    const { rerender } = render(
      <AddPlayerSheet {...defaultProps} excludePlayerIds={[]} />,
      { wrapper: createWrapper() },
    );

    const playerButton = screen.getByText("Müller").closest("button");
    fireEvent.click(playerButton!);

    rerender(
      <AddPlayerSheet {...defaultProps} excludePlayerIds={["indoor-1"]} />,
    );

    expect(screen.getByText("Müller")).toBeInTheDocument();
    // Button is still enabled to allow toggling (removal)
    expect(screen.getByText("Müller").closest("button")).toBeEnabled();
    expect(screen.getByText("Müller").closest("button")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
