import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginPage } from "./LoginPage";
import * as authStore from "@/stores/auth";
import * as demoStore from "@/stores/demo";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/stores/auth");
vi.mock("@/stores/demo");
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: "en",
  }),
}));

const mockLogin = vi.fn();
const mockSetDemoAuthenticated = vi.fn();
const mockInitializeDemoData = vi.fn();

function mockAuthStoreState(overrides = {}) {
  const state = {
    login: mockLogin,
    status: "idle" as const,
    error: null,
    setDemoAuthenticated: mockSetDemoAuthenticated,
    ...overrides,
  };
  vi.mocked(authStore.useAuthStore).mockImplementation((selector?: unknown) => {
    if (typeof selector === "function") {
      return selector(state);
    }
    return state as ReturnType<typeof authStore.useAuthStore>;
  });
}

function mockDemoStoreState() {
  const state = {
    initializeDemoData: mockInitializeDemoData,
  };
  vi.mocked(demoStore.useDemoStore).mockImplementation((selector?: unknown) => {
    if (typeof selector === "function") {
      return selector(state);
    }
    return state as ReturnType<typeof demoStore.useDemoStore>;
  });
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockAuthStoreState();
    mockDemoStoreState();
  });

  describe("Form Rendering", () => {
    it("renders login form with username and password fields", () => {
      render(<LoginPage />);

      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it("renders login button", () => {
      render(<LoginPage />);

      expect(
        screen.getByRole("button", { name: /login/i }),
      ).toBeInTheDocument();
    });

    it("renders demo mode button", () => {
      render(<LoginPage />);

      expect(
        screen.getByRole("button", { name: /demo/i }),
      ).toBeInTheDocument();
    });

    it("renders VolleyKit branding", () => {
      render(<LoginPage />);

      expect(
        screen.getByRole("heading", { name: /volleykit/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("calls login with username and password on submit", async () => {
      mockLogin.mockResolvedValue(true);

      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: "testuser" },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: "testpass" },
      });
      fireEvent.click(screen.getByRole("button", { name: /login/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("testuser", "testpass");
      });
    });

    it("navigates to home on successful login", async () => {
      mockLogin.mockResolvedValue(true);

      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: "testuser" },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: "testpass" },
      });
      fireEvent.click(screen.getByRole("button", { name: /login/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/");
      });
    });

    it("does not navigate on failed login", async () => {
      mockLogin.mockResolvedValue(false);

      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: "testuser" },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: "wrongpass" },
      });
      fireEvent.click(screen.getByRole("button", { name: /login/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Loading State", () => {
    it("disables form fields while loading", () => {
      mockAuthStoreState({ status: "loading" });

      render(<LoginPage />);

      expect(screen.getByLabelText(/username/i)).toBeDisabled();
      expect(screen.getByLabelText(/password/i)).toBeDisabled();
    });

    it("disables login button while loading", () => {
      mockAuthStoreState({ status: "loading" });

      render(<LoginPage />);

      const buttons = screen.getAllByRole("button");
      const loginButton = buttons.find(
        (btn) =>
          btn.textContent?.toLowerCase().includes("logging") ||
          btn.textContent?.toLowerCase().includes("login"),
      );
      expect(loginButton).toBeDisabled();
    });

    it("disables demo button while loading", () => {
      mockAuthStoreState({ status: "loading" });

      render(<LoginPage />);

      const demoButton = screen.getByRole("button", { name: /demo/i });
      expect(demoButton).toBeDisabled();
    });
  });

  describe("Error State", () => {
    it("displays error message when error exists", () => {
      mockAuthStoreState({ status: "error", error: "Invalid credentials" });

      render(<LoginPage />);

      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });

    it("error message has proper styling", () => {
      mockAuthStoreState({ status: "error", error: "Login failed" });

      render(<LoginPage />);

      const errorElement = screen.getByText("Login failed");
      expect(errorElement.closest("div")).toHaveClass("bg-danger-50");
    });
  });

  describe("Demo Mode", () => {
    it("initializes demo data and navigates on demo button click", () => {
      render(<LoginPage />);

      fireEvent.click(screen.getByRole("button", { name: /demo/i }));

      expect(mockInitializeDemoData).toHaveBeenCalledWith("SV");
      expect(mockSetDemoAuthenticated).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  describe("Accessibility", () => {
    it("has required attribute on username field", () => {
      render(<LoginPage />);

      expect(screen.getByLabelText(/username/i)).toHaveAttribute("required");
    });

    it("has required attribute on password field", () => {
      render(<LoginPage />);

      expect(screen.getByLabelText(/password/i)).toHaveAttribute("required");
    });

    it("has proper autocomplete attributes", () => {
      render(<LoginPage />);

      expect(screen.getByLabelText(/username/i)).toHaveAttribute(
        "autocomplete",
        "username",
      );
      expect(screen.getByLabelText(/password/i)).toHaveAttribute(
        "autocomplete",
        "current-password",
      );
    });

    it("has proper input types", () => {
      render(<LoginPage />);

      expect(screen.getByLabelText(/username/i)).toHaveAttribute("type", "text");
      expect(screen.getByLabelText(/password/i)).toHaveAttribute(
        "type",
        "password",
      );
    });
  });
});
