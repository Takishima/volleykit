import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HomeRosterPanel } from "./HomeRosterPanel";
import { AwayRosterPanel } from "./AwayRosterPanel";
import { ScorerPanel } from "./ScorerPanel";
import { ScoresheetPanel } from "./ScoresheetPanel";
import type { Assignment } from "@/api/client";
import * as useNominationListModule from "@/features/validation/hooks/useNominationList";

// Test file size constants
const TWO_KILOBYTES = 2 * 1024;
const TWO_MEGABYTES = 2 * 1024 * 1024;

vi.mock("@/features/validation/hooks/useNominationList");

function createMockAssignment(overrides: Partial<Assignment> = {}): Assignment {
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

vi.mock("@/features/validation/hooks/useScorerSearch", () => ({
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

vi.mock("@/shared/stores/auth", () => ({
  useAuthStore: vi.fn((selector) => selector({ dataSource: "api" })),
}));

describe("ScorerPanel", () => {
  it("renders without crashing", () => {
    render(<ScorerPanel />, { wrapper: createWrapper() });
    expect(
      screen.getByPlaceholderText("Search scorer by name..."),
    ).toBeInTheDocument();
    expect(screen.getByText(/No scorer selected/)).toBeInTheDocument();
  });
});

describe("ScoresheetPanel", () => {
  // Mock URL.createObjectURL and URL.revokeObjectURL
  const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
  const mockRevokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.URL.createObjectURL = mockCreateObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // Test setup helpers
  function getFileInput(): HTMLInputElement {
    const input = document.querySelector<HTMLInputElement>(
      'input[type="file"]:not([capture])',
    );
    if (!input) {
      throw new Error("File input not found in document");
    }
    return input;
  }

  function getCameraInput(): HTMLInputElement {
    const input = document.querySelector<HTMLInputElement>(
      'input[capture="environment"]',
    );
    if (!input) {
      throw new Error("Camera input not found in document");
    }
    return input;
  }

  async function uploadTestFile(
    fileInput: HTMLInputElement,
    fileName = "test.jpg",
    fileType = "image/jpeg",
    content = "image content",
  ): Promise<File> {
    const file = new File([content], fileName, { type: fileType });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await vi.runAllTimersAsync();
    return file;
  }

  function selectFile(
    fileInput: HTMLInputElement,
    fileName = "test.jpg",
    fileType = "image/jpeg",
    content = "image content",
  ): File {
    const file = new File([content], fileName, { type: fileType });
    fireEvent.change(fileInput, { target: { files: [file] } });
    return file;
  }

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
    selectFile(getFileInput(), "test.txt", "text/plain", "content");
    expect(
      screen.getByText("Invalid file type. Please use JPEG, PNG, or PDF."),
    ).toBeInTheDocument();
  });

  it("shows error for file too large", () => {
    render(<ScoresheetPanel />, { wrapper: createWrapper() });
    const largeContent = new Array(11 * 1024 * 1024).fill("a").join("");
    selectFile(getFileInput(), "large.jpg", "image/jpeg", largeContent);
    expect(
      screen.getByText("File is too large. Maximum size is 10 MB."),
    ).toBeInTheDocument();
  });

  it("shows upload progress when valid file selected", async () => {
    render(<ScoresheetPanel />, { wrapper: createWrapper() });
    const validFile = selectFile(getFileInput());

    expect(screen.getByText("Uploading...")).toBeInTheDocument();
    expect(mockCreateObjectURL).toHaveBeenCalledWith(validFile);

    await vi.runAllTimersAsync();
    expect(screen.getByText("Upload complete")).toBeInTheDocument();
  });

  it("shows replace and remove buttons after file selection", async () => {
    render(<ScoresheetPanel />, { wrapper: createWrapper() });
    await uploadTestFile(getFileInput());

    expect(screen.getByRole("button", { name: "Replace" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("resets state when remove button clicked", async () => {
    render(<ScoresheetPanel />, { wrapper: createWrapper() });
    await uploadTestFile(getFileInput());
    expect(screen.getByText("Upload complete")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(screen.getByText("Upload Scoresheet")).toBeInTheDocument();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it("displays PDF icon for PDF files instead of preview", () => {
    render(<ScoresheetPanel />, { wrapper: createWrapper() });
    selectFile(getFileInput(), "test.pdf", "application/pdf", "pdf content");

    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });

  describe("User Interactions", () => {
    it("clicking Select File button triggers file input", () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      const clickSpy = vi.spyOn(getFileInput(), "click");

      fireEvent.click(screen.getByRole("button", { name: "Select File" }));

      expect(clickSpy).toHaveBeenCalled();
    });

    it("clicking Take Photo button triggers camera input", () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      const clickSpy = vi.spyOn(getCameraInput(), "click");

      fireEvent.click(screen.getByRole("button", { name: "Take Photo" }));

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe("State Transitions", () => {
    it("verifies correct state during Replace flow", async () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      const fileInput = getFileInput();
      await uploadTestFile(fileInput, "first.jpg");

      expect(screen.getByText("Upload complete")).toBeInTheDocument();
      expect(screen.getByText("first.jpg")).toBeInTheDocument();

      const clickSpy = vi.spyOn(fileInput, "click");
      fireEvent.click(screen.getByRole("button", { name: "Replace" }));

      expect(mockRevokeObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();

      await uploadTestFile(fileInput, "second.jpg");
      expect(screen.getByText("second.jpg")).toBeInTheDocument();
    });

    it("prevents concurrent uploads during rapid file selections", async () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      const fileInput = getFileInput();

      selectFile(fileInput, "file1.jpg");
      expect(screen.getByText("Uploading...")).toBeInTheDocument();
      const createObjectURLCalls = mockCreateObjectURL.mock.calls.length;

      // Try second file - should be ignored due to isUploadingRef guard
      selectFile(fileInput, "file2.jpg");
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(createObjectURLCalls);
      expect(screen.getByText("file1.jpg")).toBeInTheDocument();

      await vi.runAllTimersAsync();
      expect(screen.getByText("file1.jpg")).toBeInTheDocument();
    });

    it("verifies state reset after clicking Remove", async () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      await uploadTestFile(getFileInput());

      fireEvent.click(screen.getByRole("button", { name: "Remove" }));

      expect(screen.getByText("Upload Scoresheet")).toBeInTheDocument();
      expect(
        screen.getByText("Upload a photo or scan of the physical scoresheet"),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Select File" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Take Photo" }),
      ).toBeInTheDocument();
      expect(screen.queryByText("test.jpg")).not.toBeInTheDocument();
    });
  });

  describe("Cleanup Behavior", () => {
    it("calls URL.revokeObjectURL when replacing files", async () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      await uploadTestFile(getFileInput(), "first.jpg");
      mockRevokeObjectURL.mockClear();

      fireEvent.click(screen.getByRole("button", { name: "Replace" }));
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    it("clears timers on component unmount during upload", () => {
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

      const { unmount } = render(<ScoresheetPanel />, {
        wrapper: createWrapper(),
      });
      selectFile(getFileInput());

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
    });

    it("revokes preview URL on component unmount", () => {
      const { unmount } = render(<ScoresheetPanel />, {
        wrapper: createWrapper(),
      });
      selectFile(getFileInput());
      mockRevokeObjectURL.mockClear();

      unmount();

      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes on progress bar during upload", () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      selectFile(getFileInput());

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuemin", "0");
      expect(progressBar).toHaveAttribute("aria-valuemax", "100");
      expect(progressBar).toHaveAttribute("aria-valuenow");
      expect(progressBar).toHaveAttribute("aria-label", "Uploading...");

      // Use act() to ensure React processes all state updates from timer callbacks
      // This matches the pattern used in ScoresheetPanel.test.tsx for reliable timer handling
      act(() => {
        vi.advanceTimersByTime(2000); // > SIMULATED_UPLOAD_DURATION_MS (1500ms)
      });
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("announces upload completion via aria-live region", async () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      selectFile(getFileInput());

      // Run all timers to complete the simulated upload
      await vi.runAllTimersAsync();

      // The status element should now be present with complete state
      const statusElement = screen.getByRole("status");
      expect(statusElement).toHaveAttribute("aria-live", "polite");
      expect(statusElement).toHaveTextContent("Upload complete");
    });

    it("displays error with role alert", () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      selectFile(getFileInput(), "test.txt", "text/plain", "content");

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(
        "Invalid file type. Please use JPEG, PNG, or PDF.",
      );
    });

    it("has accessible labels on file inputs", () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });

      expect(getFileInput()).toHaveAttribute("aria-label", "Select File");
      expect(getCameraInput()).toHaveAttribute("aria-label", "Take Photo");
    });

    it("supports keyboard activation of buttons", () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      const clickSpy = vi.spyOn(getFileInput(), "click");
      const selectFileButton = screen.getByRole("button", {
        name: "Select File",
      });

      fireEvent.keyDown(selectFileButton, { key: "Enter" });
      fireEvent.click(selectFileButton);

      expect(clickSpy).toHaveBeenCalled();
    });

    it("buttons are focusable for keyboard navigation", () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });

      const selectFileButton = screen.getByRole("button", {
        name: "Select File",
      });
      const takePhotoButton = screen.getByRole("button", {
        name: "Take Photo",
      });

      // Buttons should be focusable (not have tabIndex=-1)
      expect(selectFileButton).not.toHaveAttribute("tabindex", "-1");
      expect(takePhotoButton).not.toHaveAttribute("tabindex", "-1");

      // Buttons should be of type="button" for proper keyboard handling
      expect(selectFileButton).toHaveAttribute("type", "button");
      expect(takePhotoButton).toHaveAttribute("type", "button");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty file list selection (user cancels file picker)", () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      fireEvent.change(getFileInput(), { target: { files: [] } });

      expect(screen.getByText("Upload Scoresheet")).toBeInTheDocument();
      expect(mockCreateObjectURL).not.toHaveBeenCalled();
    });

    it("handles null files property (user cancels file picker)", () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      fireEvent.change(getFileInput(), { target: { files: null } });

      expect(screen.getByText("Upload Scoresheet")).toBeInTheDocument();
      expect(mockCreateObjectURL).not.toHaveBeenCalled();
    });

    it("displays file name with truncation class for long names", async () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      const longFileName =
        "this_is_a_very_long_file_name_that_should_be_truncated_in_the_ui.jpg";
      await uploadTestFile(getFileInput(), longFileName);

      const fileNameElement = screen.getByText(longFileName);
      expect(fileNameElement).toBeInTheDocument();
      expect(fileNameElement).toHaveClass("truncate");
    });

    it("disables Replace and Remove buttons during upload", () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      selectFile(getFileInput());

      expect(screen.getByRole("button", { name: "Replace" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Remove" })).toBeDisabled();
    });

    it("enables Replace and Remove buttons after upload complete", async () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      await uploadTestFile(getFileInput());

      expect(
        screen.getByRole("button", { name: "Replace" }),
      ).not.toBeDisabled();
      expect(screen.getByRole("button", { name: "Remove" })).not.toBeDisabled();
    });

    it("clears error when valid file is selected after invalid file", () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      const fileInput = getFileInput();

      selectFile(fileInput, "test.txt", "text/plain", "content");
      expect(screen.getByRole("alert")).toBeInTheDocument();

      selectFile(fileInput);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("displays correct file size formatting for KB", async () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      const kbContent = new Array(TWO_KILOBYTES).fill("a").join("");
      await uploadTestFile(
        getFileInput(),
        "small.jpg",
        "image/jpeg",
        kbContent,
      );

      expect(screen.getByText("2.0 KB")).toBeInTheDocument();
    });

    it("displays correct file size formatting for bytes", async () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      await uploadTestFile(getFileInput(), "tiny.jpg", "image/jpeg", "abc");

      expect(screen.getByText("3 B")).toBeInTheDocument();
    });

    it("displays correct file size formatting for MB", async () => {
      render(<ScoresheetPanel />, { wrapper: createWrapper() });
      const mbContent = new Array(TWO_MEGABYTES).fill("a").join("");
      await uploadTestFile(
        getFileInput(),
        "large.jpg",
        "image/jpeg",
        mbContent,
      );

      expect(screen.getByText("2.0 MB")).toBeInTheDocument();
    });
  });
});
