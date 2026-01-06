import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateSbbUrl, calculateArrivalTime, openSbbUrl } from "./sbb-url";

describe("sbb-url", () => {
  describe("generateSbbUrl", () => {
    const baseParams = {
      destination: "Bern",
      date: new Date("2024-12-28T14:30:00"),
      arrivalTime: new Date("2024-12-28T14:30:00"),
      language: "de" as const,
    };

    describe("von/nach format (no station IDs)", () => {
      it("uses von/nach parameters when no station IDs provided", () => {
        const url = generateSbbUrl(baseParams);

        expect(url).toContain("https://www.sbb.ch/de?");
        expect(url).toContain("nach=Bern");
        // Date and time should be quoted and encoded
        expect(url).toContain("date=%222024-12-28%22");
        expect(url).toContain("time=%2214:30%22");
        // Should use arrival time mode
        expect(url).toContain("moment=%22ARRIVAL%22");
        // Should NOT contain stops JSON
        expect(url).not.toContain("stops=");
      });

      it("includes von when originAddress is provided", () => {
        const params = {
          ...baseParams,
          originAddress: "Zürich, Bahnhofstrasse 1",
        };
        const url = generateSbbUrl(params);

        expect(url).toContain("von=Z%C3%BCrich%2C+Bahnhofstrasse+1");
        expect(url).toContain("nach=Bern");
      });

      it("omits von when no origin provided", () => {
        const url = generateSbbUrl(baseParams);

        expect(url).not.toContain("von=");
        expect(url).toContain("nach=Bern");
      });

      it("generates correct URL for French", () => {
        const url = generateSbbUrl({ ...baseParams, language: "fr" });
        expect(url).toContain("https://www.sbb.ch/fr?");
        expect(url).toContain("nach=Bern");
      });

      it("generates correct URL for Italian", () => {
        const url = generateSbbUrl({ ...baseParams, language: "it" });
        expect(url).toContain("https://www.sbb.ch/it?");
      });

      it("generates correct URL for English", () => {
        const url = generateSbbUrl({ ...baseParams, language: "en" });
        expect(url).toContain("https://www.sbb.ch/en?");
      });

      it("defaults to German when no language specified", () => {
        const params = {
          destination: "Zürich",
          date: new Date("2024-12-28T10:00:00"),
          arrivalTime: new Date("2024-12-28T10:00:00"),
        };
        const url = generateSbbUrl(params);
        expect(url).toContain("https://www.sbb.ch/de?");
        expect(url).toContain("nach=Z%C3%BCrich");
      });

      it("URL-encodes special characters in destination", () => {
        const params = {
          ...baseParams,
          destination: "Zürich HB",
        };
        const url = generateSbbUrl(params);
        expect(url).toContain("nach=Z%C3%BCrich+HB");
      });

      it("uses von/nach when only destinationStation provided", () => {
        const params = {
          ...baseParams,
          destinationStation: { id: "8507000", name: "Bern" },
        };
        const url = generateSbbUrl(params);
        // Should use von/nach because origin doesn't have station ID
        expect(url).toContain("nach=Bern");
        expect(url).not.toContain("stops=");
      });

      it("uses von/nach when only originStation provided", () => {
        const params = {
          ...baseParams,
          originStation: { id: "8503000", name: "Zürich HB" },
        };
        const url = generateSbbUrl(params);
        // Should use von/nach because destination doesn't have station ID
        expect(url).toContain("von=Z%C3%BCrich+HB");
        expect(url).toContain("nach=Bern");
        expect(url).not.toContain("stops=");
      });
    });

    describe("stops JSON format (with station IDs)", () => {
      it("uses stops JSON when both stations have IDs", () => {
        const params = {
          ...baseParams,
          originStation: { id: "8503000", name: "Zürich HB" },
          destinationStation: { id: "8507000", name: "Bern" },
        };
        const url = generateSbbUrl(params);

        expect(url).toContain("stops=");
        expect(url).not.toContain("von=");
        expect(url).not.toContain("nach=");
        // Origin should have station ID
        expect(url).toContain("%22value%22%3A%228503000%22");
        expect(url).toContain("%22label%22%3A%22Z%C3%BCrich%20HB%22");
        // Destination should have station ID
        expect(url).toContain("%22value%22%3A%228507000%22");
        expect(url).toContain("%22label%22%3A%22Bern%22");
      });

      it("prefers originStation over originAddress when both stations have IDs", () => {
        const params = {
          ...baseParams,
          originStation: { id: "8503000", name: "Zürich HB" },
          originAddress: "Zürich, Bahnhofstrasse 1",
          destinationStation: { id: "8507000", name: "Bern" },
        };
        const url = generateSbbUrl(params);
        // Should use stops format with station ID, not von/nach with address
        expect(url).toContain("stops=");
        expect(url).toContain("%22value%22%3A%228503000%22");
        expect(url).not.toContain("Bahnhofstrasse");
      });

      it("normalizes station IDs without 85 prefix", () => {
        const params = {
          ...baseParams,
          originStation: { id: "4000", name: "Pully-Nord" },
          destinationStation: { id: "73232", name: "Kloten, Freienberg" },
        };
        const url = generateSbbUrl(params);

        // IDs should be normalized to include the 85 prefix
        expect(url).toContain("%22value%22%3A%228504000%22");
        expect(url).toContain("%22value%22%3A%228573232%22");
      });

      it("does not double-prefix station IDs that already have 85", () => {
        const params = {
          ...baseParams,
          originStation: { id: "8504000", name: "Pully-Nord" },
          destinationStation: { id: "8573232", name: "Kloten, Freienberg" },
        };
        const url = generateSbbUrl(params);

        // IDs should remain unchanged
        expect(url).toContain("%22value%22%3A%228504000%22");
        expect(url).toContain("%22value%22%3A%228573232%22");
        // Should NOT have double prefix
        expect(url).not.toContain("858504000");
        expect(url).not.toContain("858573232");
      });
    });

    describe("date formatting", () => {
      it("formats date as YYYY-MM-DD with leading zeros and quotes", () => {
        const params = {
          ...baseParams,
          date: new Date("2024-01-05T10:00:00"),
          arrivalTime: new Date("2024-01-05T10:00:00"),
        };
        const url = generateSbbUrl(params);
        expect(url).toContain("date=%222024-01-05%22");
      });

      it("formats single-digit month with leading zero", () => {
        const params = {
          ...baseParams,
          date: new Date("2024-03-15T10:00:00"),
          arrivalTime: new Date("2024-03-15T10:00:00"),
        };
        const url = generateSbbUrl(params);
        expect(url).toContain("date=%222024-03-15%22");
      });
    });

    describe("time formatting", () => {
      it("formats single-digit hours with leading zero and quotes", () => {
        const params = {
          ...baseParams,
          arrivalTime: new Date("2024-12-28T09:05:00"),
        };
        const url = generateSbbUrl(params);
        expect(url).toContain("time=%2209:05%22");
      });

      it("formats midnight correctly with quotes", () => {
        const params = {
          ...baseParams,
          arrivalTime: new Date("2024-12-28T00:00:00"),
        };
        const url = generateSbbUrl(params);
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

  describe("openSbbUrl", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("opens URL in new tab with security attributes", () => {
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

      openSbbUrl("https://www.sbb.ch/de?nach=Bern");

      expect(openSpy).toHaveBeenCalledWith(
        "https://www.sbb.ch/de?nach=Bern",
        "_blank",
        "noopener,noreferrer"
      );
    });
  });
});
