import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HomeRosterPanel } from "./HomeRosterPanel";
import { AwayRosterPanel } from "./AwayRosterPanel";
import { ScorerPanel } from "./ScorerPanel";
import { ScoresheetPanel } from "./ScoresheetPanel";
import type { Assignment } from "@/api/client";
import * as useNominationListModule from "@/hooks/useNominationList";

vi.mock("@/hooks/useNominationList");

function createMockAssignment(
  overrides: Partial<Assignment> = {},
): Assignment {
  return {
    __identity: "assignment-1",
    refereePosition: "head-one",
    refereeGame: {
      game: {
        __identity: "game-1",
        startingDateTime: "2025-12-15T14:00:00Z",
        encounter: {
          teamHome: { name: "VBC Zürich" },
          teamAway: { name: "VBC Basel" },
        },
        hall: {
          name: "Sporthalle Zürich",
          primaryPostalAddress: {
            city: "Zürich",
          },
        },
      },
    },
    ...overrides,
  } as Assignment;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("HomeRosterPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("renders without crashing", () => {
    render(<HomeRosterPanel assignment={createMockAssignment()} />, {
      wrapper: createWrapper(),
    });
    // Panel renders with team name and empty roster message
    expect(screen.getByText("VBC Zürich")).toBeInTheDocument();
    expect(screen.getByText("No players in roster")).toBeInTheDocument();
  });

  it("displays home team name", () => {
    render(<HomeRosterPanel assignment={createMockAssignment()} />, {
      wrapper: createWrapper(),
    });
    expect(screen.getByText("VBC Zürich")).toBeInTheDocument();
  });

  it("passes correct team prop to RosterVerificationPanel", () => {
    render(<HomeRosterPanel assignment={createMockAssignment()} />, {
      wrapper: createWrapper(),
    });

    expect(useNominationListModule.useNominationList).toHaveBeenCalledWith(
      expect.objectContaining({
        team: "home",
        gameId: "game-1",
      }),
    );
  });
});

describe("AwayRosterPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNominationListModule.useNominationList).mockReturnValue({
      nominationList: null,
      players: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("renders without crashing", () => {
    render(<AwayRosterPanel assignment={createMockAssignment()} />, {
      wrapper: createWrapper(),
    });
    // Panel renders with team name and empty roster message
    expect(screen.getByText("VBC Basel")).toBeInTheDocument();
    expect(screen.getByText("No players in roster")).toBeInTheDocument();
  });

  it("displays away team name", () => {
    render(<AwayRosterPanel assignment={createMockAssignment()} />, {
      wrapper: createWrapper(),
    });
    expect(screen.getByText("VBC Basel")).toBeInTheDocument();
  });

  it("passes correct team prop to RosterVerificationPanel", () => {
    render(<AwayRosterPanel assignment={createMockAssignment()} />, {
      wrapper: createWrapper(),
    });

    expect(useNominationListModule.useNominationList).toHaveBeenCalledWith(
      expect.objectContaining({
        team: "away",
        gameId: "game-1",
      }),
    );
  });
});

vi.mock("@/hooks/useScorerSearch", () => ({
  useScorerSearch: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  })),
  parseSearchInput: vi.fn((input: string) => {
    if (!input.trim()) return {};
    return { lastName: input };
  }),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn((selector) => selector({ isDemoMode: false })),
}));

describe("ScorerPanel", () => {
  it("renders without crashing", () => {
    render(<ScorerPanel />, { wrapper: createWrapper() });
    expect(
      screen.getByPlaceholderText("Search scorer by name..."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No scorer selected/),
    ).toBeInTheDocument();
  });
});

describe("ScoresheetPanel", () => {
  // Mock URL.createObjectURL and URL.revokeObjectURL
  const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
  const mockRevokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<ScoresheetPanel />, { wrapper: createWrapper() });
    // Panel renders with upload UI
    expect(screen.getByText("Upload Scoresheet")).toBeInTheDocument();
    expect(
      screen.getByText("Upload a photo or scan of the physical scoresheet"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select File" }),
    ).toBeInTheDocument();
  });

  it("renders Take Photo button", () => {
    render(<ScoresheetPanel />, { wrapper: createWrapper() });
    expect(
      screen.getByRole("button", { name: "Take Photo" }),
    ).toBeInTheDocument();
  });

  it("shows accepted formats info", () => {
    render(<ScoresheetPanel />, { wrapper: createWrapper() });
    expect(screen.getByText(/JPEG, PNG, or PDF/)).toBeInTheDocument();
    expect(screen.getByText(/Max 10 MB/)).toBeInTheDocument();
  });

  it("has hidden file inputs for file and camera", () => {
    render(<ScoresheetPanel />, { wrapper: createWrapper() });
    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs).toHaveLength(2);
    // Check one accepts all file types and one is for camera
    const cameraInput = document.querySelector('input[capture="environment"]');
    expect(cameraInput).toBeInTheDocument();
  });

  it("shows error for invalid file type", () => {
    render(<ScoresheetPanel />, { wrapper: createWrapper() });

    const fileInput = document.querySelector(
      'input[type="file"]:not([capture])',
    ) as HTMLInputElement;

    const invalidFile = new File(["content"], "test.txt", {
      type: "text/plain",
    });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(
      screen.getByText("Invalid file type. Please use JPEG, PNG, or PDF."),
    ).toBeInTheDocument();
  });

  it("shows error for file too large", () => {
    render(<ScoresheetPanel />, { wrapper: createWrapper() });

    const fileInput = document.querySelector(
      'input[type="file"]:not([capture])',
    ) as HTMLInputElement;

    // Create a file larger than 10MB (10 * 1024 * 1024 bytes)
    const largeContent = new Array(11 * 1024 * 1024).fill("a").join("");
    const largeFile = new File([largeContent], "large.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(
      screen.getByText("File is too large. Maximum size is 10 MB."),
    ).toBeInTheDocument();
  });

  it("shows upload progress when valid file selected", async () => {
    render(<ScoresheetPanel />, { wrapper: createWrapper() });

    const fileInput = document.querySelector(
      'input[type="file"]:not([capture])',
    ) as HTMLInputElement;

    const validFile = new File(["image content"], "test.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Should show uploading state
    expect(screen.getByText("Uploading...")).toBeInTheDocument();
    expect(mockCreateObjectURL).toHaveBeenCalledWith(validFile);

    // Advance timers to complete upload (run all pending timers)
    await vi.runAllTimersAsync();

    expect(screen.getByText("Upload complete")).toBeInTheDocument();
  });

  it("shows replace and remove buttons after file selection", async () => {
    render(<ScoresheetPanel />, { wrapper: createWrapper() });

    const fileInput = document.querySelector(
      'input[type="file"]:not([capture])',
    ) as HTMLInputElement;

    const validFile = new File(["image content"], "test.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Advance timers to complete upload
    await vi.runAllTimersAsync();

    expect(screen.getByRole("button", { name: "Replace" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("resets state when remove button clicked", async () => {
    render(<ScoresheetPanel />, { wrapper: createWrapper() });

    const fileInput = document.querySelector(
      'input[type="file"]:not([capture])',
    ) as HTMLInputElement;

    const validFile = new File(["image content"], "test.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Advance timers to complete upload
    await vi.runAllTimersAsync();

    expect(screen.getByText("Upload complete")).toBeInTheDocument();

    // Click remove button
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    // Should return to initial state
    expect(screen.getByText("Upload Scoresheet")).toBeInTheDocument();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it("displays PDF icon for PDF files instead of preview", () => {
    render(<ScoresheetPanel />, { wrapper: createWrapper() });

    const fileInput = document.querySelector(
      'input[type="file"]:not([capture])',
    ) as HTMLInputElement;

    const pdfFile = new File(["pdf content"], "test.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    // Should show PDF indicator text
    expect(screen.getByText("PDF")).toBeInTheDocument();
    // Should NOT create object URL for PDF
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });
});
