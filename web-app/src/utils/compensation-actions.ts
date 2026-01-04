import { createElement } from "react";
import type { Assignment, CompensationRecord } from "@/api/client";
import { type SwipeAction, SWIPE_ACTION_ICON_SIZE } from "@/types/swipe";
import { Wallet, FileText } from "@/components/ui/icons";
import { isFromCalendarMode } from "@/utils/assignment-helpers";

/**
 * Disbursement method for compensation payments.
 */
type DisbursementMethod = "payout_on_site" | "central_payout";

/**
 * Extended compensation type that includes lock flags and disbursement method.
 * The API returns these fields in ConvocationCompensationDetailed,
 * and demo mode generates them for testing regional association behavior.
 */
interface ConvocationCompensationWithLockFlags {
  paymentDone?: boolean;
  lockPayoutOnSiteCompensation?: boolean;
  lockPayoutCentralPayoutCompensation?: boolean;
  methodOfDisbursementArbitration?: DisbursementMethod;
}

/**
 * Checks if compensation is locked based on the disbursement method.
 *
 * The API uses different lock flags depending on how compensation is paid:
 * - On-site payout (regional associations): Check lockPayoutOnSiteCompensation
 * - Central payout (SV national): Check lockPayoutCentralPayoutCompensation
 */
function isCompensationLocked(cc: ConvocationCompensationWithLockFlags): boolean {
  const method = cc.methodOfDisbursementArbitration;

  if (method === "payout_on_site") {
    // For on-site payout, check the on-site lock
    return cc.lockPayoutOnSiteCompensation === true;
  }

  if (method === "central_payout") {
    // For central payout, check the central payout lock
    return cc.lockPayoutCentralPayoutCompensation === true;
  }

  // If disbursement method is unknown, check both locks
  // This provides backwards compatibility when the field isn't requested
  return (
    cc.lockPayoutOnSiteCompensation === true ||
    cc.lockPayoutCentralPayoutCompensation === true
  );
}

/**
 * Checks if a compensation record can be edited.
 *
 * Editability rules (based on disbursement method):
 * - Non-editable: paymentDone=true (already paid)
 * - Non-editable: relevant lock is true based on methodOfDisbursementArbitration
 *   - payout_on_site: check lockPayoutOnSiteCompensation
 *   - central_payout: check lockPayoutCentralPayoutCompensation
 * - Editable: not paid AND relevant lock is false
 */
export function isCompensationEditable(compensation: CompensationRecord): boolean {
  const cc = compensation.convocationCompensation as
    | ConvocationCompensationWithLockFlags
    | undefined;
  if (!cc) return false;

  // Already paid - not editable
  if (cc.paymentDone) return false;

  // Check the appropriate lock based on disbursement method
  if (isCompensationLocked(cc)) return false;

  return true;
}

/**
 * Checks if an assignment's compensation can be edited.
 *
 * Editability rules (same as isCompensationEditable):
 * - Non-editable: Calendar mode assignments (missing compensation data entirely)
 * - Non-editable: paymentDone=true (already paid)
 * - Non-editable: relevant lock is true based on methodOfDisbursementArbitration
 * - Editable: convocationCompensation not present but NOT calendar mode (defaults to editable for backwards compatibility)
 * - Editable: not paid AND relevant lock is false
 */
export function isAssignmentCompensationEditable(assignment: Assignment): boolean {
  // Calendar mode assignments are read-only - compensation editing not available
  if (isFromCalendarMode(assignment)) {
    return false;
  }

  const cc = assignment.convocationCompensation as
    | ConvocationCompensationWithLockFlags
    | undefined;
  // If no compensation data but NOT calendar mode, default to editable
  // (for backwards compatibility and when the API doesn't return compensation properties)
  if (!cc) return true;

  // Already paid - not editable
  if (cc.paymentDone) return false;

  // Check the appropriate lock based on disbursement method
  if (isCompensationLocked(cc)) return false;

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
