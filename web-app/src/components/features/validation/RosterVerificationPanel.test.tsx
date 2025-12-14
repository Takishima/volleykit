import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RosterVerificationPanel } from "./RosterVerificationPanel";
import * as useNominationListModule from "@/hooks/useNominationList";
import type { RosterPlayer } from "@/hooks/useNominationList";

vi.mock("@/hooks/useNominationList");

const mockPlayers: RosterPlayer[] = [
  {
    id: "player-1",
    shirtNumber: 1,
    displayName: "John Doe",
    licenseCategory: "SEN",
    isCaptain: true,
    isLibero: false,
    isNewlyAdded: false,
  },
  {
    id: "player-2",
    shirtNumber: 7,
    displayName: "Jane Smith",
    licenseCategory: "JUN",
    isCaptain: false,
    isLibero: true,
    isNewlyAdded: false,
  },
  {
    id: "player-3",
    shirtNumber: 12,
    displayName: "Bob Wilson",
    licenseCategory: "SEN",
    isCaptain: false,
    isLibero: false,
    isNewlyAdded: false,
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("RosterVerificationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("Loading roster...")).toBeInTheDocument();
  });

  it("displays player list after loading", () => {
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: mockPlayers,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("Test Team")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Wilson")).toBeInTheDocument();
  });

  it("shows player count", () => {
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: mockPlayers,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("3 players")).toBeInTheDocument();
  });

  it("shows captain and libero indicators", () => {
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: mockPlayers,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("L")).toBeInTheDocument();
  });

  it("shows error state with retry button", () => {
    const mockRefetch = vi.fn();
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: [],
      isLoading: false,
      isError: true,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("Failed to load roster")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("shows empty state when no players", () => {
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText("No players in roster")).toBeInTheDocument();
  });

  it("shows Add Player button", () => {
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: mockPlayers,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
      />,
      { wrapper: createWrapper() },
    );

    expect(
      screen.getByRole("button", { name: /add player/i }),
    ).toBeInTheDocument();
  });

  it("marks player for removal when remove button is clicked", () => {
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: mockPlayers,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
      />,
      { wrapper: createWrapper() },
    );

    // Find the first remove button and click it
    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]!);

    // After removal, player count should decrease
    expect(screen.getByText("2 players")).toBeInTheDocument();

    // An undo button should appear
    expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
  });

  it("restores player when undo button is clicked", () => {
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: mockPlayers,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
      />,
      { wrapper: createWrapper() },
    );

    // Remove a player
    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]!);

    expect(screen.getByText("2 players")).toBeInTheDocument();

    // Undo the removal
    const undoButton = screen.getByRole("button", { name: /undo/i });
    fireEvent.click(undoButton);

    // Player count should be restored
    expect(screen.getByText("3 players")).toBeInTheDocument();
  });

  it("calls onModificationsChange when player is removed", () => {
    const onModificationsChange = vi.fn();
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: mockPlayers,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <RosterVerificationPanel
        team="home"
        teamName="Test Team"
        gameId="game-1"
        onModificationsChange={onModificationsChange}
      />,
      { wrapper: createWrapper() },
    );

    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]!);

    expect(onModificationsChange).toHaveBeenCalled();
  });
});
