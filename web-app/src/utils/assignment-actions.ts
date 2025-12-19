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

/**
 * Report data structure for PDF generation.
 */
export interface ReportData {
  title: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  date: string;
  position: string;
}

/**
 * Generates a minimal valid PDF document from report data.
 * Uses PDF 1.4 specification to create a basic document without external libraries.
 *
 * TODO(#170): Replace with template-based PDF generation. The real implementation
 * should load a sports hall report PDF template from repository assets and fill in
 * the form fields with assignment data (e.g., using pdf-lib).
 */
function generatePDFContent(data: ReportData): string {
  // PDF text encoding helper - escapes special characters
  const escapeText = (text: string): string =>
    text
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

  // Build PDF content with embedded text
  const title = escapeText(data.title);
  const content = [
    escapeText(`Game: ${data.homeTeam} vs ${data.awayTeam}`),
    escapeText(`Venue: ${data.venue}`),
    escapeText(`Date: ${data.date}`),
    escapeText(`Position: ${data.position}`),
  ];

  // PDF objects - must track byte offsets for xref table
  const objects: string[] = [];

  // Object 1: Catalog (root)
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // Object 2: Pages
  objects.push(
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
  );

  // Object 3: Page
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
  );

  // Object 4: Content stream with text
  // PDF uses bottom-left origin, so y=750 is near top of page
  const streamContent = [
    "BT", // Begin text
    "/F1 18 Tf", // Font size 18 for title
    "72 720 Td", // Move to position (72, 720)
    `(${title}) Tj`, // Show title
    "/F1 12 Tf", // Font size 12 for content
    "0 -30 Td", // Move down 30 units
    ...content.map((line, i) => (i === 0 ? `(${line}) Tj` : `0 -20 Td (${line}) Tj`)),
    "ET", // End text
  ].join("\n");

  const streamBytes = new TextEncoder().encode(streamContent);
  objects.push(
    `4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
  );

  // Object 5: Font (Helvetica - built-in PDF font, no embedding needed)
  objects.push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  );

  // Build PDF file
  const header = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";

  // Calculate byte offsets for xref table
  let offset = header.length;
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(offset);
    offset += new TextEncoder().encode(obj).length;
  }

  // Build xref table
  const xrefStart = offset;
  const xrefLines = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.map((o) => `${o.toString().padStart(10, "0")} 00000 n `),
  ].join("\n");

  // Trailer
  const trailer = [
    "\ntrailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    xrefStart.toString(),
    "%%EOF",
  ].join("\n");

  // Combine all parts
  const pdfString = header + objects.join("") + xrefLines + trailer;
  return pdfString;
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
