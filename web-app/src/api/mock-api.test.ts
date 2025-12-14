import { describe, it, expect, beforeEach } from "vitest";
import { mockApi } from "./mock-api";
import { useDemoStore } from "@/stores/demo";

describe("mockApi.searchPersons", () => {
  beforeEach(() => {
    // Initialize demo data before each test
    useDemoStore.getState().initializeDemoData();
  });

  describe("single-term search (lastName only)", () => {
    it("matches firstName when searching with single term", async () => {
      // "Hans" is a firstName in demo data
      const result = await mockApi.searchPersons({ lastName: "Hans" });
      const items = result.items!;

      expect(items.length).toBeGreaterThan(0);
      expect(items.some((s) => s.firstName === "Hans")).toBe(true);
    });

    it("matches lastName when searching with single term", async () => {
      // "Müller" is a lastName in demo data
      const result = await mockApi.searchPersons({ lastName: "Müller" });
      const items = result.items!;

      expect(items.length).toBeGreaterThan(0);
      expect(items.some((s) => s.lastName === "Müller")).toBe(true);
    });

    it("matches partial firstName with single term", async () => {
      const result = await mockApi.searchPersons({ lastName: "Han" });
      const items = result.items!;

      expect(items.length).toBeGreaterThan(0);
      expect(items.some((s) => s.firstName === "Hans")).toBe(true);
    });

    it("matches partial lastName with single term", async () => {
      const result = await mockApi.searchPersons({ lastName: "Müll" });
      const items = result.items!;

      expect(items.length).toBeGreaterThan(0);
      expect(items.some((s) => s.lastName === "Müller")).toBe(true);
    });
  });

  describe("two-term search (firstName and lastName)", () => {
    it("matches both firstName and lastName fields", async () => {
      const result = await mockApi.searchPersons({
        firstName: "Hans",
        lastName: "Müller",
      });
      const items = result.items!;

      expect(items.length).toBe(1);
      expect(items[0]?.firstName).toBe("Hans");
      expect(items[0]?.lastName).toBe("Müller");
    });

    it("returns empty when firstName matches but lastName does not", async () => {
      const result = await mockApi.searchPersons({
        firstName: "Hans",
        lastName: "Schmidt",
      });
      const items = result.items!;

      expect(items.length).toBe(0);
    });

    it("returns empty when lastName matches but firstName does not", async () => {
      const result = await mockApi.searchPersons({
        firstName: "Peter",
        lastName: "Müller",
      });
      const items = result.items!;

      expect(items.length).toBe(0);
    });
  });

  describe("accent-insensitive search", () => {
    it("matches 'muller' to 'Müller' (ü -> u)", async () => {
      const result = await mockApi.searchPersons({ lastName: "muller" });
      const items = result.items!;

      expect(items.length).toBeGreaterThan(0);
      expect(items.some((s) => s.lastName === "Müller")).toBe(true);
    });

    it("matches 'Muller' to 'Müller' (case-insensitive)", async () => {
      const result = await mockApi.searchPersons({ lastName: "Muller" });
      const items = result.items!;

      expect(items.length).toBeGreaterThan(0);
      expect(items.some((s) => s.lastName === "Müller")).toBe(true);
    });

    it("matches accented search term to accented data", async () => {
      const result = await mockApi.searchPersons({ lastName: "Müller" });
      const items = result.items!;

      expect(items.length).toBeGreaterThan(0);
      expect(items.some((s) => s.lastName === "Müller")).toBe(true);
    });

    it("matches firstName with accent-insensitive search", async () => {
      // Single term search for firstName
      const result = await mockApi.searchPersons({ lastName: "hans" });
      const items = result.items!;

      expect(items.length).toBeGreaterThan(0);
      expect(items.some((s) => s.firstName === "Hans")).toBe(true);
    });
  });

  describe("year of birth filter", () => {
    it("filters by year of birth", async () => {
      const result = await mockApi.searchPersons({ yearOfBirth: "1985" });
      const items = result.items!;

      expect(items.length).toBeGreaterThan(0);
      items.forEach((scorer) => {
        const year = new Date(scorer.birthday!).getFullYear();
        expect(year).toBe(1985);
      });
    });

    it("combines lastName and yearOfBirth filters", async () => {
      const result = await mockApi.searchPersons({
        lastName: "Müller",
        yearOfBirth: "1985",
      });
      const items = result.items!;

      expect(items).toHaveLength(1);
      const scorer = items[0]!;
      expect(scorer.lastName).toBe("Müller");
      expect(scorer.birthday).toBeDefined();
      expect(new Date(scorer.birthday!).getFullYear()).toBe(1985);
    });
  });

  describe("empty and non-matching searches", () => {
    it("returns empty array for non-existent name", async () => {
      const result = await mockApi.searchPersons({ lastName: "XYZ123" });
      const items = result.items!;

      expect(items).toHaveLength(0);
      expect(result.totalItemsCount).toBe(0);
    });

    it("returns all scorers when no filters provided", async () => {
      const result = await mockApi.searchPersons({});
      const items = result.items!;

      // Should return all demo scorers (10 in the demo data)
      expect(items.length).toBe(10);
      expect(result.totalItemsCount).toBe(10);
    });
  });

  describe("pagination", () => {
    it("respects limit option", async () => {
      const result = await mockApi.searchPersons({}, { limit: 3 });
      const items = result.items!;

      expect(items.length).toBe(3);
      expect(result.totalItemsCount).toBe(10);
    });

    it("respects offset option", async () => {
      const allResults = await mockApi.searchPersons({});
      const offsetResults = await mockApi.searchPersons({}, { offset: 5 });
      const allItems = allResults.items!;
      const offsetItems = offsetResults.items!;

      expect(offsetItems.length).toBe(5);
      expect(offsetItems[0]).toEqual(allItems[5]);
    });

    it("combines offset and limit", async () => {
      const result = await mockApi.searchPersons({}, { offset: 2, limit: 3 });
      const items = result.items!;

      expect(items.length).toBe(3);
      expect(result.totalItemsCount).toBe(10);
    });
  });
});
