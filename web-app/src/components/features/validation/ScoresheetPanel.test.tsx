import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ScoresheetPanel } from "./ScoresheetPanel";

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn((selector) => selector({ isDemoMode: false })),
}));

const SIMULATED_UPLOAD_DURATION_MS = 1500;
const PROGRESS_INTERVAL_MS = SIMULATED_UPLOAD_DURATION_MS / 10;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function createValidFile(
  name = "test.jpg",
  type = "image/jpeg",
  size = 1024,
): File {
  const content = new Array(size).fill("a").join("");
  return new File([content], name, { type });
}

function getFileInput(): HTMLInputElement {
  const fileInput = document.querySelector(
    'input[type="file"]:not([capture])',
  ) as HTMLInputElement;
  if (!fileInput) throw new Error("File input not found");
  return fileInput;
}

describe("ScoresheetPanel - onScoresheetChange callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls callback with (file, false) when upload starts", () => {
    const onScoresheetChange = vi.fn();
    render(<ScoresheetPanel onScoresheetChange={onScoresheetChange} />);

    const fileInput = getFileInput();
    const validFile = createValidFile();

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    expect(onScoresheetChange).toHaveBeenCalledWith(validFile, false);
  });

  it("calls callback with (file, true) when upload completes", async () => {
    const onScoresheetChange = vi.fn();
    render(<ScoresheetPanel onScoresheetChange={onScoresheetChange} />);

    const fileInput = getFileInput();
    const validFile = createValidFile();

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    act(() => {
      vi.advanceTimersByTime(SIMULATED_UPLOAD_DURATION_MS);
    });

    expect(onScoresheetChange).toHaveBeenLastCalledWith(validFile, true);
  });

  it("calls callback with (null, false) when file is removed", async () => {
    const onScoresheetChange = vi.fn();
    render(<ScoresheetPanel onScoresheetChange={onScoresheetChange} />);

    const fileInput = getFileInput();
    const validFile = createValidFile();

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    act(() => {
      vi.advanceTimersByTime(SIMULATED_UPLOAD_DURATION_MS);
    });

    onScoresheetChange.mockClear();

    const removeButton = screen.getByRole("button", { name: /remove/i });
    fireEvent.click(removeButton);

    expect(onScoresheetChange).toHaveBeenCalledWith(null, false);
  });

  it("does not call callback when no callback is provided", () => {
    render(<ScoresheetPanel />);

    const fileInput = getFileInput();
    const validFile = createValidFile();

    expect(() => {
      fireEvent.change(fileInput, { target: { files: [validFile] } });
      act(() => {
        vi.advanceTimersByTime(SIMULATED_UPLOAD_DURATION_MS);
      });
    }).not.toThrow();
  });

  it("calls callback in correct order during full upload lifecycle", () => {
    const onScoresheetChange = vi.fn();
    render(<ScoresheetPanel onScoresheetChange={onScoresheetChange} />);

    const fileInput = getFileInput();
    const validFile = createValidFile();

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    expect(onScoresheetChange).toHaveBeenCalledTimes(1);
    expect(onScoresheetChange).toHaveBeenNthCalledWith(1, validFile, false);

    act(() => {
      vi.advanceTimersByTime(SIMULATED_UPLOAD_DURATION_MS);
    });

    expect(onScoresheetChange).toHaveBeenCalledTimes(2);
    expect(onScoresheetChange).toHaveBeenNthCalledWith(2, validFile, true);

    const removeButton = screen.getByRole("button", { name: /remove/i });
    fireEvent.click(removeButton);

    expect(onScoresheetChange).toHaveBeenCalledTimes(3);
    expect(onScoresheetChange).toHaveBeenNthCalledWith(3, null, false);
  });

  it("calls callback with (null, false) when replace is clicked", () => {
    const onScoresheetChange = vi.fn();
    render(<ScoresheetPanel onScoresheetChange={onScoresheetChange} />);

    const fileInput = getFileInput();
    const validFile = createValidFile();

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    act(() => {
      vi.advanceTimersByTime(SIMULATED_UPLOAD_DURATION_MS);
    });

    onScoresheetChange.mockClear();

    const replaceButton = screen.getByRole("button", { name: /replace/i });
    fireEvent.click(replaceButton);

    expect(onScoresheetChange).toHaveBeenCalledWith(null, false);
  });

  it("does not call callback when file validation fails", () => {
    const onScoresheetChange = vi.fn();
    render(<ScoresheetPanel onScoresheetChange={onScoresheetChange} />);

    const fileInput = getFileInput();
    const invalidFile = createValidFile("test.txt", "text/plain");

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(onScoresheetChange).not.toHaveBeenCalled();
  });
});

describe("ScoresheetPanel - upload progress simulation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("progress transitions through 0% → 10% → ... → 90% then completes", () => {
    render(<ScoresheetPanel />);

    const fileInput = getFileInput();
    const validFile = createValidFile();

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Initial progress should be 0%
    expect(screen.getByText("0%")).toBeInTheDocument();

    // Advance through progress increments (10% each interval)
    for (let expectedProgress = 10; expectedProgress <= 90; expectedProgress += 10) {
      act(() => {
        vi.advanceTimersByTime(PROGRESS_INTERVAL_MS);
      });
      expect(screen.getByText(`${expectedProgress}%`)).toBeInTheDocument();
    }

    // When the full duration completes, state changes to "complete"
    // The 100% progress and "complete" state are set simultaneously,
    // so the progress bar is replaced with the completion message
    act(() => {
      vi.advanceTimersByTime(PROGRESS_INTERVAL_MS);
    });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText("Upload complete")).toBeInTheDocument();
  });

  it("progress bar aria-valuenow updates correctly during upload", () => {
    render(<ScoresheetPanel />);

    const fileInput = getFileInput();
    const validFile = createValidFile();

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");

    act(() => {
      vi.advanceTimersByTime(PROGRESS_INTERVAL_MS * 5);
    });
    expect(progressBar).toHaveAttribute("aria-valuenow", "50");

    act(() => {
      vi.advanceTimersByTime(PROGRESS_INTERVAL_MS * 5);
    });
    // After full duration, upload completes and progress bar is removed
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("upload state transitions from idle → uploading → complete", () => {
    render(<ScoresheetPanel />);

    const fileInput = getFileInput();
    const validFile = createValidFile();

    // Initial state: idle (no uploading or complete status)
    expect(screen.queryByText("Uploading...")).not.toBeInTheDocument();
    expect(screen.queryByText("Upload complete")).not.toBeInTheDocument();

    // Select file: uploading state
    fireEvent.change(fileInput, { target: { files: [validFile] } });
    expect(screen.getByText("Uploading...")).toBeInTheDocument();
    expect(screen.queryByText("Upload complete")).not.toBeInTheDocument();

    // Complete upload: complete state
    act(() => {
      vi.advanceTimersByTime(SIMULATED_UPLOAD_DURATION_MS);
    });
    expect(screen.queryByText("Uploading...")).not.toBeInTheDocument();
    expect(screen.getByText("Upload complete")).toBeInTheDocument();
  });
});

describe("ScoresheetPanel - race condition prevention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("blocks file selection while upload is in progress", () => {
    const onScoresheetChange = vi.fn();
    render(<ScoresheetPanel onScoresheetChange={onScoresheetChange} />);

    const fileInput = getFileInput();
    const file1 = createValidFile("first.jpg");
    const file2 = createValidFile("second.jpg");

    // Start first upload
    fireEvent.change(fileInput, { target: { files: [file1] } });
    expect(onScoresheetChange).toHaveBeenCalledWith(file1, false);
    expect(screen.getByText("first.jpg")).toBeInTheDocument();

    // Attempt second upload while first is in progress - should be ignored
    fireEvent.change(fileInput, { target: { files: [file2] } });
    expect(screen.getByText("first.jpg")).toBeInTheDocument();
    expect(screen.queryByText("second.jpg")).not.toBeInTheDocument();

    // Callback should only have been called once (for first file)
    expect(onScoresheetChange).toHaveBeenCalledTimes(1);
  });

  it("allows new upload after previous upload completes", () => {
    const onScoresheetChange = vi.fn();
    render(<ScoresheetPanel onScoresheetChange={onScoresheetChange} />);

    const fileInput = getFileInput();
    const file1 = createValidFile("first.jpg");
    const file2 = createValidFile("second.jpg");

    // First upload
    fireEvent.change(fileInput, { target: { files: [file1] } });
    act(() => {
      vi.advanceTimersByTime(SIMULATED_UPLOAD_DURATION_MS);
    });
    expect(onScoresheetChange).toHaveBeenLastCalledWith(file1, true);

    // Reset to allow new upload
    const removeButton = screen.getByRole("button", { name: /remove/i });
    fireEvent.click(removeButton);

    // Second upload should now work
    fireEvent.change(fileInput, { target: { files: [file2] } });
    expect(screen.getByText("second.jpg")).toBeInTheDocument();
    expect(onScoresheetChange).toHaveBeenCalledWith(file2, false);
  });

  it("rapid successive selections only trigger one upload", () => {
    const onScoresheetChange = vi.fn();
    render(<ScoresheetPanel onScoresheetChange={onScoresheetChange} />);

    const fileInput = getFileInput();

    // Rapid fire multiple file selections
    for (let i = 1; i <= 5; i++) {
      const file = createValidFile(`file${i}.jpg`);
      fireEvent.change(fileInput, { target: { files: [file] } });
    }

    // Only first file should be processed
    expect(screen.getByText("file1.jpg")).toBeInTheDocument();
    expect(onScoresheetChange).toHaveBeenCalledTimes(1);

    // Complete upload
    act(() => {
      vi.advanceTimersByTime(SIMULATED_UPLOAD_DURATION_MS);
    });

    // Should complete with first file
    expect(onScoresheetChange).toHaveBeenCalledTimes(2);
    expect(onScoresheetChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "file1.jpg" }),
      true,
    );
  });

  it("clears existing timers when new upload starts after reset", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    render(<ScoresheetPanel />);

    const fileInput = getFileInput();
    const file1 = createValidFile("first.jpg");
    const file2 = createValidFile("second.jpg");

    // First upload
    fireEvent.change(fileInput, { target: { files: [file1] } });
    act(() => {
      vi.advanceTimersByTime(SIMULATED_UPLOAD_DURATION_MS);
    });

    // Reset
    const removeButton = screen.getByRole("button", { name: /remove/i });
    fireEvent.click(removeButton);

    clearIntervalSpy.mockClear();
    clearTimeoutSpy.mockClear();

    // Start second upload - should clear any stale timers
    fireEvent.change(fileInput, { target: { files: [file2] } });

    // simulateUpload clears existing timers before starting new ones
    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });
});

describe("ScoresheetPanel - component cleanup", () => {
  const mockRevokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears interval timer on unmount during upload", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    const { unmount } = render(<ScoresheetPanel />);

    const fileInput = getFileInput();
    const validFile = createValidFile();

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Partially advance time (upload in progress)
    act(() => {
      vi.advanceTimersByTime(PROGRESS_INTERVAL_MS * 3);
    });

    clearIntervalSpy.mockClear();
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("clears timeout on unmount during upload", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    const { unmount } = render(<ScoresheetPanel />);

    const fileInput = getFileInput();
    const validFile = createValidFile();

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Partially advance time (upload in progress)
    act(() => {
      vi.advanceTimersByTime(PROGRESS_INTERVAL_MS * 3);
    });

    clearTimeoutSpy.mockClear();
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it("revokes preview URL on unmount", () => {
    const { unmount } = render(<ScoresheetPanel />);

    const fileInput = getFileInput();
    const validFile = createValidFile();

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    mockRevokeObjectURL.mockClear();
    unmount();

    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("does not attempt state updates after unmount", () => {
    const onScoresheetChange = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = render(
      <ScoresheetPanel onScoresheetChange={onScoresheetChange} />,
    );

    const fileInput = getFileInput();
    const validFile = createValidFile();

    fireEvent.change(fileInput, { target: { files: [validFile] } });
    expect(onScoresheetChange).toHaveBeenCalledWith(validFile, false);

    // Unmount before upload completes
    unmount();

    // Advance timers to when upload would complete
    act(() => {
      vi.advanceTimersByTime(SIMULATED_UPLOAD_DURATION_MS);
    });

    // Callback should not be called after unmount (only the initial call)
    expect(onScoresheetChange).toHaveBeenCalledTimes(1);

    // No React errors should be logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("cleans up resources when reset is called after upload completes", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    render(<ScoresheetPanel />);

    const fileInput = getFileInput();
    const validFile = createValidFile();

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Complete the upload
    act(() => {
      vi.advanceTimersByTime(SIMULATED_UPLOAD_DURATION_MS);
    });

    clearIntervalSpy.mockClear();
    clearTimeoutSpy.mockClear();
    mockRevokeObjectURL.mockClear();

    // Click remove after upload completes (buttons are only enabled after upload)
    const removeButton = screen.getByRole("button", { name: /remove/i });
    fireEvent.click(removeButton);

    // resetState clears any existing timers (even if already cleared)
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    clearIntervalSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  it("buttons are disabled during upload preventing cleanup", () => {
    render(<ScoresheetPanel />);

    const fileInput = getFileInput();
    const validFile = createValidFile();

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // During upload, buttons should be disabled
    expect(screen.getByRole("button", { name: /remove/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /replace/i })).toBeDisabled();

    // Complete upload
    act(() => {
      vi.advanceTimersByTime(SIMULATED_UPLOAD_DURATION_MS);
    });

    // After upload, buttons should be enabled
    expect(screen.getByRole("button", { name: /remove/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /replace/i })).not.toBeDisabled();
  });
});

describe("ScoresheetPanel - file validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows error for unsupported file type (text file)", () => {
    render(<ScoresheetPanel />);

    const fileInput = getFileInput();
    const textFile = createValidFile("document.txt", "text/plain");

    fireEvent.change(fileInput, { target: { files: [textFile] } });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByText("Invalid file type. Please use JPEG, PNG, or PDF."),
    ).toBeInTheDocument();
  });

  it("shows error for unsupported file type (gif)", () => {
    render(<ScoresheetPanel />);

    const fileInput = getFileInput();
    const gifFile = createValidFile("animation.gif", "image/gif");

    fireEvent.change(fileInput, { target: { files: [gifFile] } });

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows error when file exceeds size limit", () => {
    render(<ScoresheetPanel />);

    const fileInput = getFileInput();
    const largeFile = createValidFile(
      "large.jpg",
      "image/jpeg",
      MAX_FILE_SIZE_BYTES + 1,
    );

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByText("File is too large. Maximum size is 10 MB."),
    ).toBeInTheDocument();
  });

  it("accepts valid JPEG file", () => {
    render(<ScoresheetPanel />);

    const fileInput = getFileInput();
    const jpegFile = createValidFile("photo.jpg", "image/jpeg");

    fireEvent.change(fileInput, { target: { files: [jpegFile] } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    expect(screen.getByText("Uploading...")).toBeInTheDocument();
  });

  it("accepts valid PNG file", () => {
    render(<ScoresheetPanel />);

    const fileInput = getFileInput();
    const pngFile = createValidFile("image.png", "image/png");

    fireEvent.change(fileInput, { target: { files: [pngFile] } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("image.png")).toBeInTheDocument();
  });

  it("accepts valid PDF file", () => {
    render(<ScoresheetPanel />);

    const fileInput = getFileInput();
    const pdfFile = createValidFile("document.pdf", "application/pdf");

    fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("document.pdf")).toBeInTheDocument();
  });

  it("accepts file at exactly the size limit", () => {
    render(<ScoresheetPanel />);

    const fileInput = getFileInput();
    const maxSizeFile = createValidFile(
      "maxsize.jpg",
      "image/jpeg",
      MAX_FILE_SIZE_BYTES,
    );

    fireEvent.change(fileInput, { target: { files: [maxSizeFile] } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("maxsize.jpg")).toBeInTheDocument();
  });

  it("clears previous error when valid file is selected", () => {
    render(<ScoresheetPanel />);

    const fileInput = getFileInput();

    // First select invalid file
    const invalidFile = createValidFile("bad.txt", "text/plain");
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Then select valid file
    const validFile = createValidFile("good.jpg", "image/jpeg");
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("good.jpg")).toBeInTheDocument();
  });

  it("does not start upload when validation fails", () => {
    const onScoresheetChange = vi.fn();
    render(<ScoresheetPanel onScoresheetChange={onScoresheetChange} />);

    const fileInput = getFileInput();
    const invalidFile = createValidFile("bad.txt", "text/plain");

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    // Callback should not be called
    expect(onScoresheetChange).not.toHaveBeenCalled();

    // Upload state should remain idle
    expect(screen.queryByText("Uploading...")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
