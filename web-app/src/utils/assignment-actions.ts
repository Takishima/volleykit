import { createElement } from "react";
import type { Assignment } from "@/api/client";
import { type SwipeAction, SWIPE_ACTION_ICON_SIZE } from "@/types/swipe";
import { Wallet, Check, FileText, ArrowLeftRight } from "@/components/ui/icons";

// Pre-created icon elements to avoid recreating on each function call
const ICON_WALLET = createElement(Wallet, { size: SWIPE_ACTION_ICON_SIZE });
const ICON_CHECK = createElement(Check, { size: SWIPE_ACTION_ICON_SIZE });
const ICON_FILE_TEXT = createElement(FileText, { size: SWIPE_ACTION_ICON_SIZE });
const ICON_ARROW_LEFT_RIGHT = createElement(ArrowLeftRight, { size: SWIPE_ACTION_ICON_SIZE });

export interface AssignmentActionConfig {
  editCompensation: SwipeAction;
  validateGame: SwipeAction;
  generateReport: SwipeAction;
  addToExchange: SwipeAction;
}

export interface AssignmentActionHandlers {
  onEditCompensation: (assignment: Assignment) => void;
  onValidateGame: (assignment: Assignment) => void;
  onGenerateReport: (assignment: Assignment) => void;
  onAddToExchange: (assignment: Assignment) => void;
}

export function createAssignmentActions(
  assignment: Assignment,
  handlers: AssignmentActionHandlers,
): AssignmentActionConfig {
  return {
    editCompensation: {
      id: "edit-compensation",
      label: "Edit Compensation",
      shortLabel: "Edit",
      color: "bg-primary-500",
      icon: ICON_WALLET,
      onAction: () => handlers.onEditCompensation(assignment),
    },
    validateGame: {
      id: "validate-game",
      label: "Validate Game",
      shortLabel: "Validate",
      color: "bg-success-500",
      icon: ICON_CHECK,
      onAction: () => handlers.onValidateGame(assignment),
    },
    generateReport: {
      id: "generate-report",
      label: "Generate Report",
      shortLabel: "Report",
      color: "bg-warning-500",
      icon: ICON_FILE_TEXT,
      onAction: () => handlers.onGenerateReport(assignment),
    },
    addToExchange: {
      id: "add-to-exchange",
      label: "Add to Exchange",
      shortLabel: "Exchange",
      color: "bg-success-500",
      icon: ICON_ARROW_LEFT_RIGHT,
      onAction: () => handlers.onAddToExchange(assignment),
    },
  };
}
