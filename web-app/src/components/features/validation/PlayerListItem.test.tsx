import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayerListItem } from "./PlayerListItem";
import type { RosterPlayer } from "@/hooks/useNominationList";

function createMockPlayer(overrides: Partial<RosterPlayer> = {}): RosterPlayer {
  return {
    id: "player-1",
    displayName: "John Doe",
    licenseCategory: "SEN",
    isNewlyAdded: false,
    ...overrides,
  };
}

describe("PlayerListItem", () => {
  it("renders player name", () => {
    const player = createMockPlayer({ displayName: "Max" });

    render(
      <PlayerListItem
        player={player}
        formattedDisplay="Max M. 01.01.90"
        isMarkedForRemoval={false}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />,
    );

    expect(screen.getByText("Max M. 01.01.90")).toBeInTheDocument();
  });

  it("shows license category badge when provided", () => {
    const player = createMockPlayer({ licenseCategory: "JUN" });

    render(
      <PlayerListItem
        player={player}
        formattedDisplay="Doe J. 01.01.90"
        isMarkedForRemoval={false}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />,
    );

    expect(screen.getByText("JUN")).toBeInTheDocument();
  });

  it("shows newly added badge when isNewlyAdded is true", () => {
    const player = createMockPlayer({ isNewlyAdded: true });

    render(
      <PlayerListItem
        player={player}
        formattedDisplay="Doe J. 01.01.90"
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
        formattedDisplay="Doe J. 01.01.90"
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
        formattedDisplay="Doe J. 01.01.90"
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
        formattedDisplay="Doe J. 01.01.90"
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
    const formattedDisplay = "Doe J. 01.01.90";

    render(
      <PlayerListItem
        player={player}
        formattedDisplay={formattedDisplay}
        isMarkedForRemoval={true}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />,
    );

    const nameElement = screen.getByText(formattedDisplay);
    expect(nameElement).toHaveClass("line-through");
  });

  it("hides badges when marked for removal", () => {
    const player = createMockPlayer({
      licenseCategory: "SEN",
    });

    render(
      <PlayerListItem
        player={player}
        formattedDisplay="Doe J. 01.01.90"
        isMarkedForRemoval={true}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />,
    );

    expect(screen.queryByText("SEN")).not.toBeInTheDocument();
  });
});
