import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
        displayName: "Max Müller",
        firstName: "Max",
        lastName: "Müller",
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
        displayName: "Anna Schmidt",
        firstName: "Anna",
        lastName: "Schmidt",
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
        displayName: "Thomas Weber",
        firstName: "Thomas",
        lastName: "Weber",
      },
    },
    licenseCategory: "SEN",
    isAlreadyNominated: true,
  },
];

vi.mock("@/hooks/usePlayerNominations", () => ({
  usePossiblePlayerNominations: vi.fn(() => ({
    data: mockPlayers,
    isLoading: false,
    isError: false,
  })),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn((selector) =>
    selector({ isDemoMode: false }),
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

describe("AddPlayerSheet", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    nominationListId: "nomination-123",
    excludePlayerIds: [],
    onAddPlayer: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

  it("displays player list", () => {
    render(<AddPlayerSheet {...defaultProps} />, { wrapper: createWrapper() });
    expect(screen.getByText("Max Müller")).toBeInTheDocument();
    expect(screen.getByText("Anna Schmidt")).toBeInTheDocument();
  });

  it("filters out already nominated players", () => {
    render(<AddPlayerSheet {...defaultProps} />, { wrapper: createWrapper() });
    expect(screen.getByText("Max Müller")).toBeInTheDocument();
    expect(screen.queryByText("Thomas Weber")).not.toBeInTheDocument();
  });

  it("filters out excluded players", () => {
    render(
      <AddPlayerSheet {...defaultProps} excludePlayerIds={["indoor-1"]} />,
      { wrapper: createWrapper() },
    );
    expect(screen.queryByText("Max Müller")).not.toBeInTheDocument();
    expect(screen.getByText("Anna Schmidt")).toBeInTheDocument();
  });

  it("does not close when backdrop is clicked (accessibility)", () => {
    const onClose = vi.fn();
    render(<AddPlayerSheet {...defaultProps} onClose={onClose} />, {
      wrapper: createWrapper(),
    });

    const backdrop = document.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop!);

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

    expect(screen.getByText("Anna Schmidt")).toBeInTheDocument();
    expect(screen.queryByText("Max Müller")).not.toBeInTheDocument();
  });

  it("shows no results message when search has no matches", () => {
    render(<AddPlayerSheet {...defaultProps} />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText("Search players...");
    fireEvent.change(searchInput, { target: { value: "XYZ NonExistent" } });

    expect(screen.getByText("No players found")).toBeInTheDocument();
  });

  it("calls onAddPlayer when a player is selected", () => {
    const onAddPlayer = vi.fn();
    render(<AddPlayerSheet {...defaultProps} onAddPlayer={onAddPlayer} />, {
      wrapper: createWrapper(),
    });

    const playerButton = screen.getByText("Max Müller").closest("button");
    fireEvent.click(playerButton!);

    expect(onAddPlayer).toHaveBeenCalledTimes(1);
    expect(onAddPlayer).toHaveBeenCalledWith(mockPlayers[0]);
  });

  it("displays license category for players", () => {
    render(<AddPlayerSheet {...defaultProps} />, { wrapper: createWrapper() });
    expect(screen.getByText("License: SEN")).toBeInTheDocument();
    expect(screen.getByText("License: JUN")).toBeInTheDocument();
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
      "@/hooks/usePlayerNominations"
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
      "@/hooks/usePlayerNominations"
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
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("Failed to load players")).toBeInTheDocument();
  });
});
