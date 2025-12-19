import { createElement } from "react";
import type { Assignment } from "@/api/client";
import type { SwipeAction } from "@/types/swipe";
import { Wallet, Check, FileText, ArrowLeftRight } from "@/components/ui/icons";

const ICON_SIZE = 20;

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
      icon: createElement(Wallet, { size: ICON_SIZE }),
      onAction: () => handlers.onEditCompensation(assignment),
    },
    validateGame: {
      id: "validate-game",
      label: "Validate Game",
      shortLabel: "Validate",
      color: "bg-success-500",
      icon: createElement(Check, { size: ICON_SIZE }),
      onAction: () => handlers.onValidateGame(assignment),
    },
    generateReport: {
      id: "generate-report",
      label: "Generate Report",
      shortLabel: "Report",
      color: "bg-warning-500",
      icon: createElement(FileText, { size: ICON_SIZE }),
      onAction: () => handlers.onGenerateReport(assignment),
    },
    addToExchange: {
      id: "add-to-exchange",
      label: "Add to Exchange",
      shortLabel: "Exchange",
      color: "bg-success-500",
      icon: createElement(ArrowLeftRight, { size: ICON_SIZE }),
      onAction: () => handlers.onAddToExchange(assignment),
    },
  };
}

export interface ReportData {
  title: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  date: string;
  position: string;
}

// PDF layout constants (US Letter: 612x792 points)
const PDF_PAGE_WIDTH = 612;
const PDF_PAGE_HEIGHT = 792;
const PDF_LEFT_MARGIN = 72;
const PDF_TOP_POSITION = 720;
const PDF_TITLE_FONT_SIZE = 18;
const PDF_CONTENT_FONT_SIZE = 12;
const PDF_TITLE_SPACING = 30;
const PDF_LINE_SPACING = 20;

const PDF_HEADER = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";

function escapePDFText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildContentStream(data: ReportData): string {
  const title = escapePDFText(data.title);
  const lines = [
    escapePDFText(`Game: ${data.homeTeam} vs ${data.awayTeam}`),
    escapePDFText(`Venue: ${data.venue}`),
    escapePDFText(`Date: ${data.date}`),
    escapePDFText(`Position: ${data.position}`),
  ];

  return [
    "BT",
    `/F1 ${PDF_TITLE_FONT_SIZE} Tf`,
    `${PDF_LEFT_MARGIN} ${PDF_TOP_POSITION} Td`,
    `(${title}) Tj`,
    `/F1 ${PDF_CONTENT_FONT_SIZE} Tf`,
    `0 -${PDF_TITLE_SPACING} Td`,
    ...lines.map((line, i) =>
      i === 0 ? `(${line}) Tj` : `0 -${PDF_LINE_SPACING} Td (${line}) Tj`
    ),
    "ET",
  ].join("\n");
}

function buildPDFObjects(contentStream: string): string[] {
  const streamLength = new TextEncoder().encode(contentStream).length;

  return [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`,
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];
}

function buildXRefTable(objects: string[], headerLength: number): { xref: string; startOffset: number } {
  let offset = headerLength;
  const offsets: number[] = [];

  for (const obj of objects) {
    offsets.push(offset);
    offset += new TextEncoder().encode(obj).length;
  }

  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.map((o) => `${o.toString().padStart(10, "0")} 00000 n `),
  ].join("\n");

  return { xref, startOffset: offset };
}

/**
 * TODO(#170): Replace with template-based PDF generation. The real implementation
 * should load a sports hall report PDF template from repository assets and fill in
 * the form fields with assignment data (e.g., using pdf-lib).
 */
function generatePDFContent(data: ReportData): string {
  const contentStream = buildContentStream(data);
  const objects = buildPDFObjects(contentStream);
  const { xref, startOffset } = buildXRefTable(objects, PDF_HEADER.length);

  const trailer = [
    "\ntrailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    startOffset.toString(),
    "%%EOF",
  ].join("\n");

  return PDF_HEADER + objects.join("") + xref + trailer;
}

/**
 * Generates and downloads a PDF report for an assignment.
 */
export function downloadPDF(data: ReportData, filename: string): void {
  const pdfContent = generatePDFContent(data);
  const blob = new Blob([pdfContent], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
