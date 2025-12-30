import { createElement } from "react";
import type { Assignment, CompensationRecord } from "@/api/client";
import { type SwipeAction, SWIPE_ACTION_ICON_SIZE } from "@/types/swipe";
import { Wallet, FileText } from "@/components/ui/icons";

/**
 * Extended compensation type that includes lock flags.
 * The API returns these fields in ConvocationCompensationDetailed,
 * and demo mode generates them for testing regional association behavior.
 */
interface ConvocationCompensationWithLockFlags {
  paymentDone?: boolean;
  lockPayoutOnSiteCompensation?: boolean;
}

/**
 * Checks if a compensation record can be edited.
 *
 * Editability rules:
 * - Non-editable: lockPayoutOnSiteCompensation=true AND paymentDone=false (on-site payout locked)
 * - Non-editable: paymentDone=true (already paid)
 * - Editable: lockPayoutOnSiteCompensation=false AND paymentDone=false
 */
export function isCompensationEditable(compensation: CompensationRecord): boolean {
  const cc = compensation.convocationCompensation as
    | ConvocationCompensationWithLockFlags
    | undefined;
  if (!cc) return false;

  // Already paid - not editable
  if (cc.paymentDone) return false;

  // On-site payout locked - not editable (regional associations)
  if (cc.lockPayoutOnSiteCompensation === true) return false;

  return true;
}

/**
 * Checks if an assignment's compensation can be edited.
 *
 * Editability rules (same as isCompensationEditable):
 * - Non-editable: lockPayoutOnSiteCompensation=true AND paymentDone=false (on-site payout locked)
 * - Non-editable: paymentDone=true (already paid)
 * - Editable: lockPayoutOnSiteCompensation=false AND paymentDone=false
 * - Editable: convocationCompensation not present (defaults to editable for backwards compatibility)
 */
export function isAssignmentCompensationEditable(assignment: Assignment): boolean {
  const cc = assignment.convocationCompensation;
  // If no compensation data, default to editable (for backwards compatibility
  // and when the API doesn't return compensation properties)
  if (!cc) return true;

  // Already paid - not editable
  if (cc.paymentDone) return false;

  // On-site payout locked - not editable (regional associations)
  if (cc.lockPayoutOnSiteCompensation === true) return false;

  return true;
}

// Pre-created icon elements to avoid recreating on each function call
const ICON_WALLET = createElement(Wallet, { size: SWIPE_ACTION_ICON_SIZE });
const ICON_FILE_TEXT = createElement(FileText, { size: SWIPE_ACTION_ICON_SIZE });

export interface CompensationActionConfig {
  editCompensation: SwipeAction;
  generatePDF: SwipeAction;
}

export interface CompensationActionHandlers {
  onEditCompensation: (compensation: CompensationRecord) => void;
  onGeneratePDF: (compensation: CompensationRecord) => void;
}

export function createCompensationActions(
  compensation: CompensationRecord,
  handlers: CompensationActionHandlers,
): CompensationActionConfig {
  return {
    editCompensation: {
      id: "edit-compensation",
      label: "Edit Compensation",
      shortLabel: "Edit",
      color: "bg-primary-500",
      icon: ICON_WALLET,
      onAction: () => handlers.onEditCompensation(compensation),
    },
    generatePDF: {
      id: "generate-pdf",
      label: "Generate PDF",
      shortLabel: "PDF",
      color: "bg-slate-500",
      icon: ICON_FILE_TEXT,
      onAction: () => handlers.onGeneratePDF(compensation),
    },
  };
}

const API_BASE = import.meta.env.VITE_API_PROXY_URL || "";

export async function downloadCompensationPDF(
  compensationId: string,
): Promise<void> {
  const url = `${API_BASE}/indoorvolleyball.refadmin/refereestatementofexpenses/downloadrefereestatementofexpenses?refereeConvocation=${encodeURIComponent(compensationId)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }

    const contentType = response.headers.get("Content-Type");
    if (!contentType) {
      throw new Error("Missing Content-Type header in response");
    }
    if (!contentType.startsWith("application/pdf")) {
      throw new Error(
        `Invalid response type: expected PDF but received ${contentType}`,
      );
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "compensation.pdf";

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error occurred while downloading PDF");
  }
}
