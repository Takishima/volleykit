import { describe, it, expect } from "vitest";
import { generateSbbUrl, calculateArrivalTime } from "./sbb-url";

describe("sbb-url", () => {
  describe("generateSbbUrl", () => {
    const baseParams = {
      destination: "Bern",
      date: new Date("2024-12-28T14:30:00"),
      arrivalTime: new Date("2024-12-28T14:30:00"),
      language: "de" as const,
    };

    describe("website target", () => {
      it("generates correct SBB URL with stops JSON parameter", () => {
        const url = generateSbbUrl(baseParams, "website");

        expect(url).toContain("https://www.sbb.ch/de?stops=");
        // Date and time should be quoted and encoded
        expect(url).toContain("date=%222024-12-28%22");
        expect(url).toContain("time=%2214:30%22");
        // Stops JSON should be fully URL-encoded (brackets, braces, quotes, colons, commas)
        expect(url).toContain("%5B%7B%22value%22"); // [{"value"
        expect(url).toContain("%22label%22%3A%22Bern%22%7D%5D"); // "label":"Bern"}]
        // Should use arrival time mode
        expect(url).toContain("moment=ARRIVAL");
      });

      it("generates correct URL for French", () => {
        const url = generateSbbUrl({ ...baseParams, language: "fr" }, "website");
        expect(url).toContain("https://www.sbb.ch/fr?stops=");
      });

      it("generates correct URL for Italian", () => {
        const url = generateSbbUrl({ ...baseParams, language: "it" }, "website");
        expect(url).toContain("https://www.sbb.ch/it?stops=");
      });

      it("generates correct URL for English", () => {
        const url = generateSbbUrl({ ...baseParams, language: "en" }, "website");
        expect(url).toContain("https://www.sbb.ch/en?stops=");
      });

      it("defaults to German when no language specified", () => {
        const params = {
          destination: "Zürich",
          date: new Date("2024-12-28T10:00:00"),
          arrivalTime: new Date("2024-12-28T10:00:00"),
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("https://www.sbb.ch/de?stops=");
      });

      it("includes destination in stops JSON with full URL encoding", () => {
        const params = {
          ...baseParams,
          destination: "Zürich HB",
        };
        const url = generateSbbUrl(params, "website");
        // The destination should be fully URL-encoded
        expect(url).toContain("%22label%22%3A%22Z%C3%BCrich%20HB%22");
      });

      it("includes empty origin in stops array when not provided", () => {
        const url = generateSbbUrl(baseParams, "website");
        // First stop should be empty (origin) - fully URL-encoded
        expect(url).toContain("%7B%22value%22%3A%22%22%2C%22type%22%3A%22%22%2C%22label%22%3A%22%22%7D");
      });

      it("uses station ID when destinationStation is provided", () => {
        const params = {
          ...baseParams,
          destinationStation: { id: "8507000", name: "Bern" },
        };
        const url = generateSbbUrl(params, "website");
        // Should contain the Didok ID and type "ID" - fully URL-encoded
        expect(url).toContain("%22value%22%3A%228507000%22");
        expect(url).toContain("%22type%22%3A%22ID%22");
        expect(url).toContain("%22label%22%3A%22Bern%22");
      });

      it("uses destination label as fallback when no station ID", () => {
        const url = generateSbbUrl(baseParams, "website");
        // Should have empty value and type, but destination in label - fully URL-encoded
        expect(url).toContain("%22value%22%3A%22%22%2C%22type%22%3A%22%22%2C%22label%22%3A%22Bern%22");
      });

      it("includes origin station when provided", () => {
        const params = {
          ...baseParams,
          originStation: { id: "8503000", name: "Zürich HB" },
          destinationStation: { id: "8507000", name: "Bern" },
        };
        const url = generateSbbUrl(params, "website");
        // Origin should have station ID
        expect(url).toContain("%22value%22%3A%228503000%22");
        expect(url).toContain("%22label%22%3A%22Z%C3%BCrich%20HB%22");
      });
    });

    describe("app target", () => {
      it("generates same SBB URL format as website", () => {
        const url = generateSbbUrl(baseParams, "app");

        // App also uses the SBB website URL (responsive, works on mobile)
        expect(url).toContain("https://www.sbb.ch/de?stops=");
        expect(url).toContain("date=%222024-12-28%22");
        expect(url).toContain("time=%2214:30%22");
      });
    });

    describe("date formatting", () => {
      it("formats date as YYYY-MM-DD with leading zeros and quotes", () => {
        const params = {
          ...baseParams,
          date: new Date("2024-01-05T10:00:00"),
          arrivalTime: new Date("2024-01-05T10:00:00"),
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("date=%222024-01-05%22");
      });

      it("formats single-digit month with leading zero", () => {
        const params = {
          ...baseParams,
          date: new Date("2024-03-15T10:00:00"),
          arrivalTime: new Date("2024-03-15T10:00:00"),
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("date=%222024-03-15%22");
      });
    });

    describe("time formatting", () => {
      it("formats single-digit hours with leading zero and quotes", () => {
        const params = {
          ...baseParams,
          arrivalTime: new Date("2024-12-28T09:05:00"),
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("time=%2209:05%22");
      });

      it("formats midnight correctly with quotes", () => {
        const params = {
          ...baseParams,
          arrivalTime: new Date("2024-12-28T00:00:00"),
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("time=%2200:00%22");
      });
    });
  });

  describe("calculateArrivalTime", () => {
    it("subtracts buffer minutes from game start time", () => {
      const gameStart = new Date("2024-12-28T15:00:00");
      const arrivalTime = calculateArrivalTime(gameStart, 60);

      expect(arrivalTime.getHours()).toBe(14);
      expect(arrivalTime.getMinutes()).toBe(0);
    });

    it("handles ISO string input", () => {
      const arrivalTime = calculateArrivalTime("2024-12-28T15:00:00", 30);

      expect(arrivalTime.getHours()).toBe(14);
      expect(arrivalTime.getMinutes()).toBe(30);
    });

    it("handles zero buffer", () => {
      const gameStart = new Date("2024-12-28T15:00:00");
      const arrivalTime = calculateArrivalTime(gameStart, 0);

      expect(arrivalTime.getTime()).toBe(gameStart.getTime());
    });

    it("handles large buffer crossing midnight", () => {
      const gameStart = new Date("2024-12-28T01:00:00");
      const arrivalTime = calculateArrivalTime(gameStart, 120);

      expect(arrivalTime.getDate()).toBe(27);
      expect(arrivalTime.getHours()).toBe(23);
    });
  });
});
