import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ScoresheetPanel } from "./ScoresheetPanel";

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn((selector) => selector({ isDemoMode: false })),
}));

const SIMULATED_UPLOAD_DURATION_MS = 1500;

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
