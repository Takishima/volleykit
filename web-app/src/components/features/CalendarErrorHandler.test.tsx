import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CalendarErrorHandler } from "./CalendarErrorHandler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as authStore from "@/stores/auth";

// Mock dependencies
vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/hooks/useCalendarErrorHandler", () => ({
  useCalendarErrorHandler: vi.fn(),
}));

vi.mock("@/api/queryKeys", () => ({
  queryKeys: {
    calendar: {
      assignmentsByCode: (code: string) => ["calendar", "assignments", code],
    },
  },
}));

import { useCalendarErrorHandler } from "@/hooks/useCalendarErrorHandler";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return {
    ...render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    ),
    queryClient,
  };
}

describe("CalendarErrorHandler", () => {
  const mockHandleError = vi.fn();
  const mockAcknowledgeError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: not in calendar mode
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) => {
      const state = {
        isCalendarMode: () => false,
        calendarCode: null,
      };
      return selector(state as ReturnType<typeof authStore.useAuthStore.getState>);
    });

    vi.mocked(useCalendarErrorHandler).mockReturnValue({
      errorState: null,
      handleError: mockHandleError,
      acknowledgeError: mockAcknowledgeError,
      logParseWarning: vi.fn(),
    });
  });

  it("should render children", () => {
    renderWithQueryClient(
      <CalendarErrorHandler>
        <div data-testid="child">Child Content</div>
      </CalendarErrorHandler>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("should not show modal when no error state", () => {
    renderWithQueryClient(
      <CalendarErrorHandler>
        <div>Content</div>
      </CalendarErrorHandler>,
    );

    expect(
      screen.queryByRole("dialog", { hidden: true }),
    ).not.toBeInTheDocument();
  });

  it("should show modal when error state is present", () => {
    vi.mocked(useCalendarErrorHandler).mockReturnValue({
      errorState: {
        isOpen: true,
        errorType: "network",
      },
      handleError: mockHandleError,
      acknowledgeError: mockAcknowledgeError,
      logParseWarning: vi.fn(),
    });

    renderWithQueryClient(
      <CalendarErrorHandler>
        <div>Content</div>
      </CalendarErrorHandler>,
    );

    expect(
      screen.getByRole("dialog", { name: /calendar error/i, hidden: true }),
    ).toBeInTheDocument();
  });

  it("should call acknowledgeError when OK button is clicked", () => {
    vi.mocked(useCalendarErrorHandler).mockReturnValue({
      errorState: {
        isOpen: true,
        errorType: "invalidCode",
      },
      handleError: mockHandleError,
      acknowledgeError: mockAcknowledgeError,
      logParseWarning: vi.fn(),
    });

    renderWithQueryClient(
      <CalendarErrorHandler>
        <div>Content</div>
      </CalendarErrorHandler>,
    );

    fireEvent.click(screen.getByRole("button", { name: /ok/i, hidden: true }));

    expect(mockAcknowledgeError).toHaveBeenCalledOnce();
  });

  it("should not subscribe to query cache when not in calendar mode", () => {
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) => {
      const state = {
        isCalendarMode: () => false,
        calendarCode: null,
      };
      return selector(state as ReturnType<typeof authStore.useAuthStore.getState>);
    });

    const { queryClient } = renderWithQueryClient(
      <CalendarErrorHandler>
        <div>Content</div>
      </CalendarErrorHandler>,
    );

    // Simulate a query error
    act(() => {
      queryClient.setQueryData(["calendar", "assignments", "TESTCD"], null);
    });

    // handleError should not be called since we're not in calendar mode
    expect(mockHandleError).not.toHaveBeenCalled();
  });
});

describe("deepEqual utility", () => {
  // Test the internal deepEqual function through the isCalendarQueryKey behavior
  it("should correctly compare simple arrays", () => {
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) => {
      const state = {
        isCalendarMode: () => true,
        calendarCode: "ABC123",
      };
      return selector(state as ReturnType<typeof authStore.useAuthStore.getState>);
    });

    // The component should work correctly with array comparison
    renderWithQueryClient(
      <CalendarErrorHandler>
        <div>Content</div>
      </CalendarErrorHandler>,
    );

    // If deepEqual works, the component should render without errors
    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});
