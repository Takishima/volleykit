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
      it("generates correct search.ch URL", () => {
        const url = generateSbbUrl(baseParams, "website");

        expect(url).toContain("https://search.ch/fahrplan/");
        expect(url).toContain("to=Bern");
        expect(url).toContain("date=28.12.2024");
        expect(url).toContain("time=14%3A30");
        expect(url).toContain("time_type=arrival");
      });

      it("uses search.ch regardless of language", () => {
        const urlDe = generateSbbUrl({ ...baseParams, language: "de" }, "website");
        const urlFr = generateSbbUrl({ ...baseParams, language: "fr" }, "website");
        const urlIt = generateSbbUrl({ ...baseParams, language: "it" }, "website");
        const urlEn = generateSbbUrl({ ...baseParams, language: "en" }, "website");

        // All should use search.ch
        expect(urlDe).toContain("https://search.ch/fahrplan/");
        expect(urlFr).toContain("https://search.ch/fahrplan/");
        expect(urlIt).toContain("https://search.ch/fahrplan/");
        expect(urlEn).toContain("https://search.ch/fahrplan/");
      });

      it("URL-encodes special characters in destination", () => {
        const params = {
          ...baseParams,
          destination: "Zürich HB",
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("to=Z%C3%BCrich+HB");
      });
    });

    describe("app target", () => {
      it("generates correct SBB app URL", () => {
        const url = generateSbbUrl(baseParams, "app");

        expect(url).toContain("https://app.sbbmobile.ch/timetable");
        expect(url).toContain("to=Bern");
        expect(url).toContain("date=28.12.2024");
        expect(url).toContain("time=14%3A30");
        expect(url).toContain("timeType=arrival");
      });

      it("does not include language path in app URL", () => {
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
        expect(url).toContain("date=05.01.2024");
      });

      it("formats single-digit month with leading zero", () => {
        const params = {
          ...baseParams,
          date: new Date("2024-03-15T10:00:00"),
          arrivalTime: new Date("2024-03-15T10:00:00"),
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("date=15.03.2024");
      });
    });

    describe("time formatting", () => {
      it("formats single-digit hours with leading zero", () => {
        const params = {
          ...baseParams,
          arrivalTime: new Date("2024-12-28T09:05:00"),
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("time=09%3A05");
      });

      it("formats midnight correctly", () => {
        const params = {
          ...baseParams,
          arrivalTime: new Date("2024-12-28T00:00:00"),
        };
        const url = generateSbbUrl(params, "website");
        expect(url).toContain("time=00%3A00");
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
