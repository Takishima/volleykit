import { createElement } from "react";
import type { GameExchange } from "@/api/client";
import { type SwipeAction, SWIPE_ACTION_ICON_SIZE } from "@/types/swipe";
import { Check, X } from "@/components/ui/icons";

// Pre-created icon elements to avoid recreating on each function call
const ICON_CHECK = createElement(Check, { size: SWIPE_ACTION_ICON_SIZE });
const ICON_X = createElement(X, { size: SWIPE_ACTION_ICON_SIZE });

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
      icon: ICON_CHECK,
      onAction: () => handlers.onTakeOver(exchange),
    },
    removeFromExchange: {
      id: "remove-from-exchange",
      label: "Remove",
      shortLabel: "Remove",
      color: "bg-danger-500",
      icon: ICON_X,
      onAction: () => handlers.onRemoveFromExchange(exchange),
    },
  };
}
