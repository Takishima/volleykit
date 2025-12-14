import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayerListItem } from "./PlayerListItem";
import type { RosterPlayer } from "@/hooks/useNominationList";

function createMockPlayer(overrides: Partial<RosterPlayer> = {}): RosterPlayer {
  return {
    id: "player-1",
    shirtNumber: 7,
    displayName: "John Doe",
    licenseCategory: "SEN",
    isCaptain: false,
    isLibero: false,
    isNewlyAdded: false,
    ...overrides,
  };
}

describe("PlayerListItem", () => {
  it("renders player number and name", () => {
    const player = createMockPlayer({ shirtNumber: 12, displayName: "Max" });

    render(
      <PlayerListItem
        player={player}
        isMarkedForRemoval={false}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />,
    );

    expect(screen.getByText("#12")).toBeInTheDocument();
    expect(screen.getByText("Max")).toBeInTheDocument();
  });

  it("shows license category badge when provided", () => {
    const player = createMockPlayer({ licenseCategory: "JUN" });

    render(
      <PlayerListItem
        player={player}
        isMarkedForRemoval={false}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />,
    );

    expect(screen.getByText("JUN")).toBeInTheDocument();
  });

  it("shows captain indicator when isCaptain is true", () => {
    const player = createMockPlayer({ isCaptain: true });

    render(
      <PlayerListItem
        player={player}
        isMarkedForRemoval={false}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />,
    );

    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("shows libero indicator when isLibero is true", () => {
    const player = createMockPlayer({ isLibero: true });

    render(
      <PlayerListItem
        player={player}
        isMarkedForRemoval={false}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />,
    );

    expect(screen.getByText("L")).toBeInTheDocument();
  });

  it("shows newly added badge when isNewlyAdded is true", () => {
    const player = createMockPlayer({ isNewlyAdded: true });

    render(
      <PlayerListItem
        player={player}
        isMarkedForRemoval={false}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />,
    );

    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("calls onRemove when remove button is clicked", () => {
    const onRemove = vi.fn();
    const player = createMockPlayer();

    render(
      <PlayerListItem
        player={player}
        isMarkedForRemoval={false}
        onRemove={onRemove}
        onUndoRemoval={vi.fn()}
      />,
    );

    const removeButton = screen.getByRole("button", { name: /remove/i });
    fireEvent.click(removeButton);

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("shows undo button when marked for removal", () => {
    const player = createMockPlayer();

    render(
      <PlayerListItem
        player={player}
        isMarkedForRemoval={true}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
  });

  it("calls onUndoRemoval when undo button is clicked", () => {
    const onUndoRemoval = vi.fn();
    const player = createMockPlayer();

    render(
      <PlayerListItem
        player={player}
        isMarkedForRemoval={true}
        onRemove={vi.fn()}
        onUndoRemoval={onUndoRemoval}
      />,
    );

    const undoButton = screen.getByRole("button", { name: /undo/i });
    fireEvent.click(undoButton);

    expect(onUndoRemoval).toHaveBeenCalledTimes(1);
  });

  it("applies strikethrough styling when marked for removal", () => {
    const player = createMockPlayer();

    render(
      <PlayerListItem
        player={player}
        isMarkedForRemoval={true}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />,
    );

    const nameElement = screen.getByText(player.displayName);
    expect(nameElement).toHaveClass("line-through");
  });

  it("hides badges when marked for removal", () => {
    const player = createMockPlayer({
      isCaptain: true,
      isLibero: false,
      licenseCategory: "SEN",
    });

    render(
      <PlayerListItem
        player={player}
        isMarkedForRemoval={true}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />,
    );

    expect(screen.queryByText("C")).not.toBeInTheDocument();
    expect(screen.queryByText("SEN")).not.toBeInTheDocument();
  });

  it("does not show captain indicator when not captain", () => {
    const player = createMockPlayer({ isCaptain: false });

    render(
      <PlayerListItem
        player={player}
        isMarkedForRemoval={false}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />,
    );

    expect(screen.queryByText("C")).not.toBeInTheDocument();
  });

  it("does not show libero indicator when not libero", () => {
    const player = createMockPlayer({ isLibero: false });

    render(
      <PlayerListItem
        player={player}
        isMarkedForRemoval={false}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />,
    );

    expect(screen.queryByText("L")).not.toBeInTheDocument();
  });
});
