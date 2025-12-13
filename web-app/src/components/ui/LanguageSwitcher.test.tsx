import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguageStore } from "@/stores/language";

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    // Reset to default locale before each test
    useLanguageStore.getState().changeLocale("de");
  });

  describe("compact variant", () => {
    it("renders all language buttons", () => {
      render(<LanguageSwitcher />);
      expect(
        screen.getByRole("button", { name: "Deutsch" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Français" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Italiano" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "English" }),
      ).toBeInTheDocument();
    });

    it("marks current language as pressed", () => {
      render(<LanguageSwitcher />);
      const germanButton = screen.getByRole("button", { name: "Deutsch" });
      expect(germanButton).toHaveAttribute("aria-pressed", "true");
    });

    it("updates locale when language button is clicked", () => {
      render(<LanguageSwitcher />);
      const frenchButton = screen.getByRole("button", { name: "Français" });

      fireEvent.click(frenchButton);

      expect(useLanguageStore.getState().locale).toBe("fr");
      expect(frenchButton).toHaveAttribute("aria-pressed", "true");
    });

    it("applies active styles to current language", () => {
      render(<LanguageSwitcher />);
      const germanButton = screen.getByRole("button", { name: "Deutsch" });
      expect(germanButton).toHaveClass("bg-orange-500", "text-white");
    });

    it("applies custom className", () => {
      const { container } = render(
        <LanguageSwitcher className="custom-class" />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("custom-class");
    });
  });

  describe("grid variant", () => {
    it("renders all language buttons in grid layout", () => {
      render(<LanguageSwitcher variant="grid" />);
      expect(
        screen.getByRole("button", { name: "Deutsch" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Français" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Italiano" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "English" }),
      ).toBeInTheDocument();
    });

    it("uses grid layout classes", () => {
      const { container } = render(<LanguageSwitcher variant="grid" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("grid", "grid-cols-2", "sm:grid-cols-4");
    });

    it("marks current language as pressed in grid variant", () => {
      render(<LanguageSwitcher variant="grid" />);
      const germanButton = screen.getByRole("button", { name: "Deutsch" });
      expect(germanButton).toHaveAttribute("aria-pressed", "true");
    });

    it("updates locale when language button is clicked in grid variant", () => {
      render(<LanguageSwitcher variant="grid" />);
      const italianButton = screen.getByRole("button", { name: "Italiano" });

      fireEvent.click(italianButton);

      expect(useLanguageStore.getState().locale).toBe("it");
      expect(italianButton).toHaveAttribute("aria-pressed", "true");
    });

    it("applies active styles to current language in grid variant", () => {
      render(<LanguageSwitcher variant="grid" />);
      const germanButton = screen.getByRole("button", { name: "Deutsch" });
      expect(germanButton).toHaveClass("border-orange-500", "bg-orange-50");
    });
  });

  describe("language switching", () => {
    it("switches between all languages correctly", () => {
      render(<LanguageSwitcher />);

      // Start with German
      expect(useLanguageStore.getState().locale).toBe("de");

      // Switch to French
      fireEvent.click(screen.getByRole("button", { name: "Français" }));
      expect(useLanguageStore.getState().locale).toBe("fr");

      // Switch to Italian
      fireEvent.click(screen.getByRole("button", { name: "Italiano" }));
      expect(useLanguageStore.getState().locale).toBe("it");

      // Switch to English
      fireEvent.click(screen.getByRole("button", { name: "English" }));
      expect(useLanguageStore.getState().locale).toBe("en");

      // Switch back to German
      fireEvent.click(screen.getByRole("button", { name: "Deutsch" }));
      expect(useLanguageStore.getState().locale).toBe("de");
    });
  });

  describe("accessibility", () => {
    it("has proper aria-label for each button", () => {
      render(<LanguageSwitcher />);

      expect(screen.getByRole("button", { name: "Deutsch" })).toHaveAttribute(
        "aria-label",
        "Deutsch",
      );
      expect(screen.getByRole("button", { name: "Français" })).toHaveAttribute(
        "aria-label",
        "Français",
      );
      expect(screen.getByRole("button", { name: "Italiano" })).toHaveAttribute(
        "aria-label",
        "Italiano",
      );
      expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
        "aria-label",
        "English",
      );
    });

    it("indicates pressed state with aria-pressed", () => {
      render(<LanguageSwitcher />);

      const germanButton = screen.getByRole("button", { name: "Deutsch" });
      const frenchButton = screen.getByRole("button", { name: "Français" });

      expect(germanButton).toHaveAttribute("aria-pressed", "true");
      expect(frenchButton).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(frenchButton);

      expect(germanButton).toHaveAttribute("aria-pressed", "false");
      expect(frenchButton).toHaveAttribute("aria-pressed", "true");
    });

    it("is keyboard accessible", () => {
      render(<LanguageSwitcher />);
      const frenchButton = screen.getByRole("button", { name: "Français" });

      frenchButton.focus();
      expect(frenchButton).toHaveFocus();
    });
  });
});
