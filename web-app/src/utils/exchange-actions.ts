import { createElement } from "react";
import type { GameExchange } from "@/api/client";
import type { SwipeAction } from "@/types/swipe";
import { Check, X } from "@/components/ui/icons";

const ICON_SIZE = 20;

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
      icon: createElement(Check, { size: ICON_SIZE }),
      onAction: () => handlers.onTakeOver(exchange),
    },
    removeFromExchange: {
      id: "remove-from-exchange",
      label: "Remove",
      shortLabel: "Remove",
      color: "bg-danger-500",
      icon: createElement(X, { size: ICON_SIZE }),
      onAction: () => handlers.onRemoveFromExchange(exchange),
    },
  };
}
