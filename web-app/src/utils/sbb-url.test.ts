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
        expect(url).toContain("date=2024-12-28");
        expect(url).toContain("time=14:30");
        // Check that destination is in the encoded stops parameter
        expect(url).toContain(encodeURIComponent('"label":"Bern"'));
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

      it("URL-encodes special characters in destination", () => {
        const params = {
          ...baseParams,
          destination: "Zürich HB",
        };
        const url = generateSbbUrl(params, "website");
        // The destination should be inside the JSON stops parameter
        expect(url).toContain(encodeURIComponent('"label":"Zürich HB"'));
      });

      it("includes empty origin in stops array", () => {
        const url = generateSbbUrl(baseParams, "website");
        // First stop should be empty (origin)
        expect(url).toContain(encodeURIComponent('{"value":"","type":"","label":""}'));
      });
    });

    describe("app target", () => {
      it("generates same SBB URL format as website", () => {
        const url = generateSbbUrl(baseParams, "app");

        // App also uses the SBB website URL (responsive, works on mobile)
        expect(url).toContain("https://www.sbb.ch/de?stops=");
        expect(url).toContain("date=2024-12-28");
        expect(url).toContain("time=14:30");
      });
    });

    describe("date formatting", () => {
      it("formats date as YYYY-MM-DD with leading zeros", () => {
        const params = {
          ...baseParams,
          date: new Date("2024-01-05T10:00:00"),
          arrivalTime: new Date("2024-01-05T10:00:00"),
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("date=2024-01-05");
      });

      it("formats single-digit month with leading zero", () => {
        const params = {
          ...baseParams,
          date: new Date("2024-03-15T10:00:00"),
          arrivalTime: new Date("2024-03-15T10:00:00"),
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("date=2024-03-15");
      });
    });

    describe("time formatting", () => {
      it("formats single-digit hours with leading zero", () => {
        const params = {
          ...baseParams,
          arrivalTime: new Date("2024-12-28T09:05:00"),
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("time=09:05");
      });

      it("formats midnight correctly", () => {
        const params = {
          ...baseParams,
          arrivalTime: new Date("2024-12-28T00:00:00"),
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("time=00:00");
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
