import type { Assignment } from "@/api/client";
import type { SwipeAction } from "@/types/swipe";

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
      icon: "💰",
      onAction: () => handlers.onEditCompensation(assignment),
    },
    validateGame: {
      id: "validate-game",
      label: "Validate Game",
      shortLabel: "Validate",
      color: "bg-success-500",
      icon: "✓",
      onAction: () => handlers.onValidateGame(assignment),
    },
    generateReport: {
      id: "generate-report",
      label: "Generate Report",
      shortLabel: "Report",
      color: "bg-warning-500",
      icon: "📄",
      onAction: () => handlers.onGenerateReport(assignment),
    },
    addToExchange: {
      id: "add-to-exchange",
      label: "Add to Exchange",
      shortLabel: "Exchange",
      color: "bg-success-500",
      icon: "↔",
      onAction: () => handlers.onAddToExchange(assignment),
    },
  };
}

export function downloadPDF(content: string, filename: string): void {
  // TODO(#170): Replace with actual PDF generation when API is available
  // Currently creates a text file with mock content instead of a real PDF
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.replace(".pdf", ".txt");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
