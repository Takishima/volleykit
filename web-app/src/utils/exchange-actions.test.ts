import { describe, it, expect, vi } from "vitest";
import { createExchangeActions } from "./exchange-actions";
import type { GameExchange } from "@/api/client";

const mockExchange: GameExchange = {
  __identity: "test-exchange-1",
  status: "open",
  refereeGame: {
    game: {
      startingDateTime: "2025-12-15T18:00:00Z",
      encounter: {
        teamHome: { name: "Team A" },
        teamAway: { name: "Team B" },
      },
      hall: {
        name: "Main Arena",
      },
    },
  },
} as GameExchange;

describe("createExchangeActions", () => {
  it("should create both action handlers", () => {
    const handlers = {
      onTakeOver: vi.fn(),
      onRemoveFromExchange: vi.fn(),
    };

    const actions = createExchangeActions(mockExchange, handlers);

    expect(actions.takeOver).toBeDefined();
    expect(actions.removeFromExchange).toBeDefined();
  });

  it("should call correct handler when take over action is triggered", () => {
    const handlers = {
      onTakeOver: vi.fn(),
      onRemoveFromExchange: vi.fn(),
    };

    const actions = createExchangeActions(mockExchange, handlers);

    actions.takeOver.onAction();
    expect(handlers.onTakeOver).toHaveBeenCalledWith(mockExchange);
    expect(handlers.onRemoveFromExchange).not.toHaveBeenCalled();
  });

  it("should call correct handler when remove from exchange action is triggered", () => {
    const handlers = {
      onTakeOver: vi.fn(),
      onRemoveFromExchange: vi.fn(),
    };

    const actions = createExchangeActions(mockExchange, handlers);

    actions.removeFromExchange.onAction();
    expect(handlers.onRemoveFromExchange).toHaveBeenCalledWith(mockExchange);
    expect(handlers.onTakeOver).not.toHaveBeenCalled();
  });

  it("should have correct take over action properties", () => {
    const handlers = {
      onTakeOver: vi.fn(),
      onRemoveFromExchange: vi.fn(),
    };

    const actions = createExchangeActions(mockExchange, handlers);

    expect(actions.takeOver.id).toBe("take-over");
    expect(actions.takeOver.label).toBe("Take Over");
    expect(actions.takeOver.shortLabel).toBe("Take Over");
    expect(actions.takeOver.color).toBe("bg-success-500");
    expect(actions.takeOver.icon).toBe("✓");
  });

  it("should have correct remove from exchange action properties", () => {
    const handlers = {
      onTakeOver: vi.fn(),
      onRemoveFromExchange: vi.fn(),
    };

    const actions = createExchangeActions(mockExchange, handlers);

    expect(actions.removeFromExchange.id).toBe("remove-from-exchange");
    expect(actions.removeFromExchange.label).toBe("Remove");
    expect(actions.removeFromExchange.shortLabel).toBe("Remove");
    expect(actions.removeFromExchange.color).toBe("bg-danger-500");
    expect(actions.removeFromExchange.icon).toBe("✕");
  });
});
