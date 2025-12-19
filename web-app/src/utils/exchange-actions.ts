import type { GameExchange } from "@/api/client";
import type { SwipeAction } from "@/types/swipe";

// Swipe action icons
const ICON_CHECKMARK = "✓";
const ICON_REMOVE = "✕";

export interface ExchangeActionConfig {
  takeOver: SwipeAction;
  removeFromExchange: SwipeAction;
}

export interface ExchangeActionHandlers {
  onTakeOver: (exchange: GameExchange) => void;
  onRemoveFromExchange: (exchange: GameExchange) => void;
}

export function createExchangeActions(
  exchange: GameExchange,
  handlers: ExchangeActionHandlers,
): ExchangeActionConfig {
  return {
    takeOver: {
      id: "take-over",
      label: "Take Over",
      shortLabel: "Take Over",
      color: "bg-success-500",
      icon: ICON_CHECKMARK,
      onAction: () => handlers.onTakeOver(exchange),
    },
    removeFromExchange: {
      id: "remove-from-exchange",
      label: "Remove",
      shortLabel: "Remove",
      color: "bg-danger-500",
      icon: ICON_REMOVE,
      onAction: () => handlers.onRemoveFromExchange(exchange),
    },
  };
}
