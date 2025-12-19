import { createElement } from "react";
import type { CompensationRecord } from "@/api/client";
import { type SwipeAction, SWIPE_ACTION_ICON_SIZE } from "@/types/swipe";
import { Wallet, FileText } from "@/components/ui/icons";

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
      color: "bg-warning-500",
      icon: ICON_FILE_TEXT,
      onAction: () => handlers.onGeneratePDF(compensation),
    },
  };
}

const API_BASE =
  import.meta.env.VITE_API_PROXY_URL || (import.meta.env.DEV ? "" : "");

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
