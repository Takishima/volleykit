import { describe, it, expect, vi } from "vitest";
import { isValidElement } from "react";
import { createAssignmentActions, downloadPDF } from "./assignment-actions";
import type { Assignment } from "@/api/client";

const mockAssignment: Assignment = {
  __identity: "test-assignment-1",
  refereePosition: "head-one",
  refereeConvocationStatus: "active",
  refereeGame: {
    game: {
      startingDateTime: "2025-12-15T18:00:00Z",
      encounter: {
        teamHome: { name: "Team A" },
        teamAway: { name: "Team B" },
      },
      hall: {
        name: "Main Arena",
      },
    },
  },
} as Assignment;

describe("createAssignmentActions", () => {
  it("should create all four action handlers", () => {
    const handlers = {
      onEditCompensation: vi.fn(),
      onValidateGame: vi.fn(),
      onGenerateReport: vi.fn(),
      onAddToExchange: vi.fn(),
    };

    const actions = createAssignmentActions(mockAssignment, handlers);

    expect(actions.editCompensation).toBeDefined();
    expect(actions.validateGame).toBeDefined();
    expect(actions.generateReport).toBeDefined();
    expect(actions.addToExchange).toBeDefined();
  });

  it("should call correct handler when action is triggered", () => {
    const handlers = {
      onEditCompensation: vi.fn(),
      onValidateGame: vi.fn(),
      onGenerateReport: vi.fn(),
      onAddToExchange: vi.fn(),
    };

    const actions = createAssignmentActions(mockAssignment, handlers);

    actions.editCompensation.onAction();
    expect(handlers.onEditCompensation).toHaveBeenCalledWith(mockAssignment);

    actions.validateGame.onAction();
    expect(handlers.onValidateGame).toHaveBeenCalledWith(mockAssignment);

    actions.generateReport.onAction();
    expect(handlers.onGenerateReport).toHaveBeenCalledWith(mockAssignment);

    actions.addToExchange.onAction();
    expect(handlers.onAddToExchange).toHaveBeenCalledWith(mockAssignment);
  });

  it("should have correct action properties", () => {
    const handlers = {
      onEditCompensation: vi.fn(),
      onValidateGame: vi.fn(),
      onGenerateReport: vi.fn(),
      onAddToExchange: vi.fn(),
    };

    const actions = createAssignmentActions(mockAssignment, handlers);

    expect(actions.editCompensation.id).toBe("edit-compensation");
    expect(actions.editCompensation.label).toBe("Edit Compensation");
    expect(actions.editCompensation.color).toBe("bg-primary-500");
    expect(isValidElement(actions.editCompensation.icon)).toBe(true);

    expect(actions.validateGame.id).toBe("validate-game");
    expect(actions.validateGame.label).toBe("Validate Game");
    expect(actions.validateGame.color).toBe("bg-success-500");
    expect(isValidElement(actions.validateGame.icon)).toBe(true);
  });
});

describe("downloadPDF", () => {
  it("should create and trigger download link with PDF blob", () => {
    const createElementSpy = vi.spyOn(document, "createElement");
    const appendChildSpy = vi
      .spyOn(document.body, "appendChild")
      .mockImplementation(() => ({}) as Node);
    const removeChildSpy = vi
      .spyOn(document.body, "removeChild")
      .mockImplementation(() => ({}) as Node);
    const createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test-url");
    const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");

    const reportData = {
      title: "Sports Hall Report",
      homeTeam: "Team A",
      awayTeam: "Team B",
      venue: "Main Arena",
      date: "12/15/2025",
      position: "head-one",
    };

    downloadPDF(reportData, "test.pdf");

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:test-url");

    // Verify Blob was created with PDF MIME type
    const blobArg = createObjectURLSpy.mock.calls[0]?.[0] as Blob;
    expect(blobArg.type).toBe("application/pdf");

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it("should generate valid PDF structure", () => {
    const createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test-url");
    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(document.body, "appendChild").mockImplementation(() => ({}) as Node);
    vi.spyOn(document.body, "removeChild").mockImplementation(() => ({}) as Node);

    const reportData = {
      title: "Test Report",
      homeTeam: "Home",
      awayTeam: "Away",
      venue: "Stadium",
      date: "01/01/2025",
      position: "head-two",
    };

    downloadPDF(reportData, "report.pdf");

    // Get the Blob that was created
    const blobArg = createObjectURLSpy.mock.calls[0]?.[0] as Blob;

    // Read Blob content and verify PDF header
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      expect(content).toContain("%PDF-1.4");
      expect(content).toContain("%%EOF");
    };
    reader.readAsText(blobArg);

    vi.restoreAllMocks();
  });

  it("should escape special characters in report data", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test-url");
    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(document.body, "appendChild").mockImplementation(() => ({}) as Node);
    vi.spyOn(document.body, "removeChild").mockImplementation(() => ({}) as Node);

    // Test with special characters that need escaping in PDF
    const reportData = {
      title: "Report (Test)",
      homeTeam: "Team\\A",
      awayTeam: "Team)B",
      venue: "Arena (Main)",
      date: "01/01/2025",
      position: "head-one",
    };

    // Should not throw
    expect(() => downloadPDF(reportData, "report.pdf")).not.toThrow();

    vi.restoreAllMocks();
  });
});
