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
      it("generates correct URL for German", () => {
        const url = generateSbbUrl(baseParams, "website");

        expect(url).toContain("https://www.sbb.ch/de/kaufen/pages/fahrplan/fahrplan.xhtml");
        expect(url).toContain("nach=Bern");
        expect(url).toContain("datum=28.12.2024");
        expect(url).toContain("zeit=14%3A30");
        expect(url).toContain("an=true");
        expect(url).toContain("suche=true");
      });

      it("generates correct URL for French", () => {
        const url = generateSbbUrl({ ...baseParams, language: "fr" }, "website");
        expect(url).toContain("https://www.sbb.ch/fr/acheter/pages/fahrplan/fahrplan.xhtml");
      });

      it("generates correct URL for Italian", () => {
        const url = generateSbbUrl({ ...baseParams, language: "it" }, "website");
        expect(url).toContain("https://www.sbb.ch/it/acquistare/pages/fahrplan/fahrplan.xhtml");
      });

      it("generates correct URL for English", () => {
        const url = generateSbbUrl({ ...baseParams, language: "en" }, "website");
        expect(url).toContain("https://www.sbb.ch/en/buying/pages/fahrplan/fahrplan.xhtml");
      });

      it("defaults to English when no language specified", () => {
        const params = {
          destination: "Zürich",
          date: new Date("2024-12-28T10:00:00"),
          arrivalTime: new Date("2024-12-28T10:00:00"),
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("https://www.sbb.ch/en/buying/pages/fahrplan/fahrplan.xhtml");
      });

      it("URL-encodes special characters in destination", () => {
        const params = {
          ...baseParams,
          destination: "Zürich HB",
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("nach=Z%C3%BCrich+HB");
      });
    });

    describe("app target", () => {
      it("generates correct app URL", () => {
        const url = generateSbbUrl(baseParams, "app");

        expect(url).toContain("https://app.sbbmobile.ch/timetable");
        expect(url).toContain("nach=Bern");
        expect(url).toContain("datum=28.12.2024");
        expect(url).toContain("zeit=14%3A30");
        expect(url).toContain("an=true");
      });

      it("does not include language in app URL", () => {
        const url = generateSbbUrl(baseParams, "app");
        expect(url).not.toContain("/de/");
        expect(url).not.toContain("/fr/");
      });
    });

    describe("date formatting", () => {
      it("formats single-digit day with leading zero", () => {
        const params = {
          ...baseParams,
          date: new Date("2024-01-05T10:00:00"),
          arrivalTime: new Date("2024-01-05T10:00:00"),
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("datum=05.01.2024");
      });

      it("formats single-digit month with leading zero", () => {
        const params = {
          ...baseParams,
          date: new Date("2024-03-15T10:00:00"),
          arrivalTime: new Date("2024-03-15T10:00:00"),
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("datum=15.03.2024");
      });
    });

    describe("time formatting", () => {
      it("formats single-digit hours with leading zero", () => {
        const params = {
          ...baseParams,
          arrivalTime: new Date("2024-12-28T09:05:00"),
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("zeit=09%3A05");
      });

      it("formats midnight correctly", () => {
        const params = {
          ...baseParams,
          arrivalTime: new Date("2024-12-28T00:00:00"),
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("zeit=00%3A00");
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
