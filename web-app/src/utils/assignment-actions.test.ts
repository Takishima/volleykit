import { describe, it, expect, vi } from "vitest";
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
    expect(actions.editCompensation.icon).toBe("💰");

    expect(actions.validateGame.id).toBe("validate-game");
    expect(actions.validateGame.label).toBe("Validate Game");
    expect(actions.validateGame.color).toBe("bg-success-500");
    expect(actions.validateGame.icon).toBe("✓");
  });
});

describe("downloadPDF", () => {
  it("should create and trigger download link", () => {
    const createElementSpy = vi.spyOn(document, "createElement");
    const appendChildSpy = vi
      .spyOn(document.body, "appendChild")
      .mockImplementation(() => ({}) as Node);
    const removeChildSpy = vi
      .spyOn(document.body, "removeChild")
      .mockImplementation(() => ({}) as Node);

    downloadPDF("test content", "test.pdf");

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
