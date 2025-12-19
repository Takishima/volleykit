import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isValidElement } from "react";
import {
  createCompensationActions,
  downloadCompensationPDF,
} from "./compensation-actions";
import type { CompensationRecord } from "@/api/client";

const mockCompensation: CompensationRecord = {
  __identity: "test-compensation-1",
  convocationCompensation: {
    gameCompensation: 50,
    travelExpenses: 20,
    paymentDone: false,
  },
  refereeGame: {
    game: {
      startingDateTime: "2025-12-15T18:00:00Z",
      encounter: {
        teamHome: { name: "Team A" },
        teamAway: { name: "Team B" },
      },
    },
  },
} as CompensationRecord;

describe("createCompensationActions", () => {
  it("should create both action handlers", () => {
    const handlers = {
      onEditCompensation: vi.fn(),
      onGeneratePDF: vi.fn(),
    };

    const actions = createCompensationActions(mockCompensation, handlers);

    expect(actions.editCompensation).toBeDefined();
    expect(actions.generatePDF).toBeDefined();
  });

  it("should call correct handler when action is triggered", () => {
    const handlers = {
      onEditCompensation: vi.fn(),
      onGeneratePDF: vi.fn(),
    };

    const actions = createCompensationActions(mockCompensation, handlers);

    actions.editCompensation.onAction();
    expect(handlers.onEditCompensation).toHaveBeenCalledWith(mockCompensation);

    actions.generatePDF.onAction();
    expect(handlers.onGeneratePDF).toHaveBeenCalledWith(mockCompensation);
  });

  it("should have correct action properties", () => {
    const handlers = {
      onEditCompensation: vi.fn(),
      onGeneratePDF: vi.fn(),
    };

    const actions = createCompensationActions(mockCompensation, handlers);

    expect(actions.editCompensation.id).toBe("edit-compensation");
    expect(actions.editCompensation.label).toBe("Edit Compensation");
    expect(actions.editCompensation.color).toBe("bg-primary-500");
    expect(isValidElement(actions.editCompensation.icon)).toBe(true);

    expect(actions.generatePDF.id).toBe("generate-pdf");
    expect(actions.generatePDF.label).toBe("Generate PDF");
    expect(actions.generatePDF.color).toBe("bg-warning-500");
    expect(isValidElement(actions.generatePDF.icon)).toBe(true);
  });
});

describe("downloadCompensationPDF", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as typeof fetch;

    // Mock URL.createObjectURL and URL.revokeObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    globalThis.URL.revokeObjectURL = vi.fn();

    // Mock document methods
    vi.spyOn(document, "createElement").mockReturnValue({
      click: vi.fn(),
    } as unknown as HTMLElement);
    vi.spyOn(document.body, "appendChild").mockImplementation(
      () => ({}) as Node,
    );
    vi.spyOn(document.body, "removeChild").mockImplementation(
      () => ({}) as Node,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should successfully download PDF with correct URL encoding", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name === "Content-Type") return "application/pdf";
          if (name === "Content-Disposition")
            return 'attachment; filename="compensation-123.pdf"';
          return null;
        },
      },
      blob: () =>
        Promise.resolve(new Blob(["mock pdf"], { type: "application/pdf" })),
    });

    await downloadCompensationPDF("test-compensation-1");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent("test-compensation-1")),
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      }),
    );

    expect(document.createElement).toHaveBeenCalledWith("a");
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("should handle special characters in compensation ID", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name === "Content-Type") return "application/pdf";
          return null;
        },
      },
      blob: () =>
        Promise.resolve(new Blob(["mock pdf"], { type: "application/pdf" })),
    });

    const specialId = "comp/123&test=value";
    await downloadCompensationPDF(specialId);

    const fetchCall = mockFetch.mock.calls[0]?.[0] as string;
    expect(fetchCall).toContain(encodeURIComponent(specialId));
    expect(fetchCall).not.toContain("comp/123&test=value"); // Should be encoded
  });

  it("should throw error on non-OK response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: "Not Found",
    });

    await expect(
      downloadCompensationPDF("test-compensation-1"),
    ).rejects.toThrow("Failed to download PDF: Not Found");
  });

  it("should validate PDF content type", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name === "Content-Type") return "text/html";
          return null;
        },
      },
      blob: () =>
        Promise.resolve(new Blob(["<html></html>"], { type: "text/html" })),
    });

    await expect(
      downloadCompensationPDF("test-compensation-1"),
    ).rejects.toThrow(
      "Invalid response type: expected PDF but received text/html",
    );
  });

  it("should reject response without Content-Type header", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: () => null,
      },
      blob: () =>
        Promise.resolve(new Blob(["mock pdf"], { type: "application/pdf" })),
    });

    await expect(
      downloadCompensationPDF("test-compensation-1"),
    ).rejects.toThrow("Missing Content-Type header in response");
  });

  it("should extract filename from Content-Disposition header", async () => {
    const createElementSpy = vi.spyOn(document, "createElement");
    const mockLink = {
      href: "",
      download: "",
      click: vi.fn(),
    } as unknown as HTMLAnchorElement;
    createElementSpy.mockReturnValue(mockLink);

    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name === "Content-Type") return "application/pdf";
          if (name === "Content-Disposition")
            return 'attachment; filename="test-report.pdf"';
          return null;
        },
      },
      blob: () =>
        Promise.resolve(new Blob(["mock pdf"], { type: "application/pdf" })),
    });

    await downloadCompensationPDF("test-compensation-1");

    expect(mockLink.download).toBe("test-report.pdf");
  });

  it("should use default filename when Content-Disposition is missing", async () => {
    const createElementSpy = vi.spyOn(document, "createElement");
    const mockLink = {
      href: "",
      download: "",
      click: vi.fn(),
    } as unknown as HTMLAnchorElement;
    createElementSpy.mockReturnValue(mockLink);

    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name === "Content-Type") return "application/pdf";
          return null;
        },
      },
      blob: () =>
        Promise.resolve(new Blob(["mock pdf"], { type: "application/pdf" })),
    });

    await downloadCompensationPDF("test-compensation-1");

    expect(mockLink.download).toBe("compensation.pdf");
  });

  it("should handle network errors", async () => {
    mockFetch.mockRejectedValue(new Error("Network failure"));

    await expect(
      downloadCompensationPDF("test-compensation-1"),
    ).rejects.toThrow("Network failure");
  });

  it("should handle non-Error thrown values", async () => {
    mockFetch.mockRejectedValue("string error");

    await expect(
      downloadCompensationPDF("test-compensation-1"),
    ).rejects.toThrow("Unknown error occurred while downloading PDF");
  });

  it("should handle empty compensation ID", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name === "Content-Type") return "application/pdf";
          return null;
        },
      },
      blob: () =>
        Promise.resolve(new Blob(["mock pdf"], { type: "application/pdf" })),
    });

    await downloadCompensationPDF("");

    const fetchCall = mockFetch.mock.calls[0]?.[0] as string;
    expect(fetchCall).toContain("refereeConvocation=");
  });

  it("should handle whitespace-only compensation ID", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name === "Content-Type") return "application/pdf";
          return null;
        },
      },
      blob: () =>
        Promise.resolve(new Blob(["mock pdf"], { type: "application/pdf" })),
    });

    await downloadCompensationPDF("   ");

    const fetchCall = mockFetch.mock.calls[0]?.[0] as string;
    expect(fetchCall).toContain(encodeURIComponent("   "));
  });
});
