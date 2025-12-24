import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildFormData,
  setCsrfToken,
  getCsrfToken,
  clearCsrfToken,
} from "./form-serialization";

describe("form-serialization", () => {
  beforeEach(() => {
    clearCsrfToken();
  });

  afterEach(() => {
    clearCsrfToken();
  });

  describe("CSRF token management", () => {
    it("getCsrfToken returns null when no token is set", () => {
      expect(getCsrfToken()).toBeNull();
    });

    it("setCsrfToken stores and retrieves the token", () => {
      setCsrfToken("test-token-123");
      expect(getCsrfToken()).toBe("test-token-123");
    });

    it("clearCsrfToken removes the stored token", () => {
      setCsrfToken("test-token");
      clearCsrfToken();
      expect(getCsrfToken()).toBeNull();
    });

    it("setCsrfToken with null clears the token", () => {
      setCsrfToken("test-token");
      setCsrfToken(null);
      expect(getCsrfToken()).toBeNull();
    });
  });

  describe("buildFormData basic functionality", () => {
    it("flattens simple key-value pairs", () => {
      const result = buildFormData({ name: "test", value: 123 });
      expect(result.get("name")).toBe("test");
      expect(result.get("value")).toBe("123");
    });

    it("includes CSRF token by default when set", () => {
      setCsrfToken("csrf-token-xyz");
      const result = buildFormData({ key: "value" });
      expect(result.get("__csrfToken")).toBe("csrf-token-xyz");
    });

    it("excludes CSRF token when includeCsrfToken is false", () => {
      setCsrfToken("csrf-token-xyz");
      const result = buildFormData({ key: "value" }, { includeCsrfToken: false });
      expect(result.get("__csrfToken")).toBeNull();
    });

    it("does not include CSRF token when none is set", () => {
      const result = buildFormData({ key: "value" });
      expect(result.get("__csrfToken")).toBeNull();
    });

    it("flattens nested objects with bracket notation", () => {
      const result = buildFormData({
        config: { offset: 0, limit: 10 },
      });
      expect(result.get("config[offset]")).toBe("0");
      expect(result.get("config[limit]")).toBe("10");
    });

    it("flattens arrays with numeric indices", () => {
      const result = buildFormData({
        items: ["a", "b", "c"],
      });
      expect(result.get("items[0]")).toBe("a");
      expect(result.get("items[1]")).toBe("b");
      expect(result.get("items[2]")).toBe("c");
    });

    it("handles deeply nested structures", () => {
      const result = buildFormData({
        level1: {
          level2: {
            level3: { value: "deep" },
          },
        },
      });
      expect(result.get("level1[level2][level3][value]")).toBe("deep");
    });
  });

  describe("circular reference detection", () => {
    it("throws error for direct circular reference", () => {
      const obj: Record<string, unknown> = { name: "test" };
      obj.self = obj;

      expect(() => buildFormData(obj)).toThrow(
        "Circular reference detected in form data"
      );
    });

    it("throws error for indirect circular reference", () => {
      const objA: Record<string, unknown> = { name: "A" };
      const objB: Record<string, unknown> = { name: "B" };
      objA.refB = objB;
      objB.refA = objA;

      expect(() => buildFormData(objA)).toThrow(
        "Circular reference detected in form data"
      );
    });

    it("throws error for deeply nested circular reference", () => {
      const root: Record<string, unknown> = { name: "root" };
      const level1: Record<string, unknown> = { name: "level1" };
      const level2: Record<string, unknown> = { name: "level2" };
      const level3: Record<string, unknown> = { name: "level3" };

      root.child = level1;
      level1.child = level2;
      level2.child = level3;
      level3.backToRoot = root;

      expect(() => buildFormData(root)).toThrow(
        "Circular reference detected in form data"
      );
    });

    it("throws error for circular reference in array", () => {
      const arr: unknown[] = [1, 2, 3];
      arr.push(arr);

      expect(() => buildFormData({ items: arr })).toThrow(
        "Circular reference detected in form data"
      );
    });

    it("throws error for object referencing itself through array", () => {
      const obj: Record<string, unknown> = { name: "test" };
      const arr = [1, 2, obj];
      obj.myArray = arr;

      expect(() => buildFormData(obj)).toThrow(
        "Circular reference detected in form data"
      );
    });
  });

  describe("non-circular shared references", () => {
    it("allows the same object to be referenced in different branches", () => {
      const sharedObj = { id: 123, name: "shared" };
      const result = buildFormData({
        first: sharedObj,
        second: sharedObj,
      });

      expect(result.get("first[id]")).toBe("123");
      expect(result.get("first[name]")).toBe("shared");
      expect(result.get("second[id]")).toBe("123");
      expect(result.get("second[name]")).toBe("shared");
    });

    it("allows the same array to be referenced in different branches", () => {
      const sharedArr = ["x", "y", "z"];
      const result = buildFormData({
        listA: sharedArr,
        listB: sharedArr,
      });

      expect(result.get("listA[0]")).toBe("x");
      expect(result.get("listA[1]")).toBe("y");
      expect(result.get("listB[0]")).toBe("x");
      expect(result.get("listB[2]")).toBe("z");
    });

    it("handles diamond-shaped object graphs without false circular detection", () => {
      const shared = { value: "common" };
      const branchA = { ref: shared, name: "A" };
      const branchB = { ref: shared, name: "B" };

      const result = buildFormData({
        left: branchA,
        right: branchB,
      });

      expect(result.get("left[ref][value]")).toBe("common");
      expect(result.get("left[name]")).toBe("A");
      expect(result.get("right[ref][value]")).toBe("common");
      expect(result.get("right[name]")).toBe("B");
    });
  });

  describe("MAX_DEPTH boundary testing", () => {
    it("accepts nesting at exactly MAX_DEPTH (10 levels)", () => {
      // Build an object with exactly 10 levels of nesting
      // depth 0: root, depth 1: level1, ..., depth 10: level10
      let current: Record<string, unknown> = { value: "at-max-depth" };
      for (let i = 9; i >= 1; i--) {
        current = { [`level${i}`]: current };
      }
      const data = { root: current };

      // This should succeed - exactly 10 levels
      const result = buildFormData(data);
      expect(
        result.get(
          "root[level1][level2][level3][level4][level5][level6][level7][level8][level9][value]"
        )
      ).toBe("at-max-depth");
    });

    it("throws error when exceeding MAX_DEPTH (11 levels)", () => {
      // Build an object with 11 levels of nesting
      let current: Record<string, unknown> = { value: "too-deep" };
      for (let i = 10; i >= 1; i--) {
        current = { [`level${i}`]: current };
      }
      const data = { root: current };

      // This should throw - 11 levels exceeds MAX_DEPTH of 10
      expect(() => buildFormData(data)).toThrow(
        "Form data exceeds maximum nesting depth of 10"
      );
    });

    it("counts array nesting towards depth limit", () => {
      // Build nested arrays that exceed depth
      let current: unknown = "deep-value";
      for (let i = 0; i < 11; i++) {
        current = [current];
      }

      expect(() => buildFormData({ data: current })).toThrow(
        "Form data exceeds maximum nesting depth of 10"
      );
    });

    it("counts mixed object and array nesting towards depth limit", () => {
      // Alternating objects and arrays to exceed depth limit
      // Each level: l1->arr[0]->l3->arr[0]->l5->arr[0]->l7->arr[0]->l9->arr[0]->l11->value
      // depth:       0    1     2    3      4    5      6    7      8    9      10   11 (exceeds!)
      const data = {
        l1: [
          {
            l3: [
              {
                l5: [
                  {
                    l7: [
                      {
                        l9: [
                          {
                            l11: [
                              {
                                // This exceeds MAX_DEPTH, should fail
                                value: "too-deep",
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      expect(() => buildFormData(data)).toThrow(
        "Form data exceeds maximum nesting depth of 10"
      );
    });
  });

  describe("edge cases: empty arrays, null, undefined", () => {
    it("skips null values at top level", () => {
      const result = buildFormData({ key: null, other: "value" });
      expect(result.has("key")).toBe(false);
      expect(result.get("other")).toBe("value");
    });

    it("skips undefined values at top level", () => {
      const result = buildFormData({ key: undefined, other: "value" });
      expect(result.has("key")).toBe(false);
      expect(result.get("other")).toBe("value");
    });

    it("skips null values in nested objects", () => {
      const result = buildFormData({
        config: { active: true, disabled: null },
      });
      expect(result.get("config[active]")).toBe("true");
      expect(result.has("config[disabled]")).toBe(false);
    });

    it("skips undefined values in nested objects", () => {
      const result = buildFormData({
        config: { active: true, disabled: undefined },
      });
      expect(result.get("config[active]")).toBe("true");
      expect(result.has("config[disabled]")).toBe(false);
    });

    it("handles empty arrays (produces no parameters)", () => {
      const result = buildFormData({ items: [], other: "value" });
      // Empty arrays should not produce any keys
      expect(result.has("items")).toBe(false);
      expect(result.has("items[0]")).toBe(false);
      expect(result.get("other")).toBe("value");
    });

    it("handles empty objects (produces no parameters)", () => {
      const result = buildFormData({ config: {}, other: "value" });
      expect(result.has("config")).toBe(false);
      expect(result.get("other")).toBe("value");
    });

    it("handles arrays containing null and undefined", () => {
      const result = buildFormData({
        items: ["a", null, "b", undefined, "c"],
      });
      expect(result.get("items[0]")).toBe("a");
      expect(result.has("items[1]")).toBe(false); // null skipped
      expect(result.get("items[2]")).toBe("b");
      expect(result.has("items[3]")).toBe(false); // undefined skipped
      expect(result.get("items[4]")).toBe("c");
    });

    it("handles completely empty input object", () => {
      const result = buildFormData({});
      expect(result.toString()).toBe("");
    });
  });

  describe("mixed-type array serialization", () => {
    it("serializes arrays with mixed primitive types", () => {
      const result = buildFormData({
        values: [1, "two", true, false, 3.14],
      });
      expect(result.get("values[0]")).toBe("1");
      expect(result.get("values[1]")).toBe("two");
      expect(result.get("values[2]")).toBe("true");
      expect(result.get("values[3]")).toBe("false");
      expect(result.get("values[4]")).toBe("3.14");
    });

    it("serializes arrays with mixed objects and primitives", () => {
      const result = buildFormData({
        items: [
          { type: "object", id: 1 },
          "string-item",
          42,
          { nested: { value: "deep" } },
        ],
      });
      expect(result.get("items[0][type]")).toBe("object");
      expect(result.get("items[0][id]")).toBe("1");
      expect(result.get("items[1]")).toBe("string-item");
      expect(result.get("items[2]")).toBe("42");
      expect(result.get("items[3][nested][value]")).toBe("deep");
    });

    it("serializes nested arrays correctly", () => {
      const result = buildFormData({
        matrix: [
          [1, 2, 3],
          [4, 5, 6],
        ],
      });
      expect(result.get("matrix[0][0]")).toBe("1");
      expect(result.get("matrix[0][1]")).toBe("2");
      expect(result.get("matrix[0][2]")).toBe("3");
      expect(result.get("matrix[1][0]")).toBe("4");
      expect(result.get("matrix[1][1]")).toBe("5");
      expect(result.get("matrix[1][2]")).toBe("6");
    });

    it("serializes arrays of objects with different shapes", () => {
      const result = buildFormData({
        filters: [
          { propertyName: "status", value: "active" },
          { propertyName: "date", from: "2024-01-01", to: "2024-12-31" },
          { propertyName: "count", min: 0 },
        ],
      });
      expect(result.get("filters[0][propertyName]")).toBe("status");
      expect(result.get("filters[0][value]")).toBe("active");
      expect(result.get("filters[1][propertyName]")).toBe("date");
      expect(result.get("filters[1][from]")).toBe("2024-01-01");
      expect(result.get("filters[1][to]")).toBe("2024-12-31");
      expect(result.get("filters[2][propertyName]")).toBe("count");
      expect(result.get("filters[2][min]")).toBe("0");
    });
  });

  describe("special characters in object keys", () => {
    it("preserves special characters in keys", () => {
      const result = buildFormData({
        "key-with-dash": "value1",
        key_with_underscore: "value2",
        "key.with.dots": "value3",
      });
      expect(result.get("key-with-dash")).toBe("value1");
      expect(result.get("key_with_underscore")).toBe("value2");
      expect(result.get("key.with.dots")).toBe("value3");
    });

    it("handles keys with brackets (already in bracket notation)", () => {
      // This is the actual use case from the API client
      const result = buildFormData({
        "game[__identity]": "game-123",
        "scoresheet[__identity]": "ss-456",
      });
      expect(result.get("game[__identity]")).toBe("game-123");
      expect(result.get("scoresheet[__identity]")).toBe("ss-456");
    });

    it("handles nested keys with special characters", () => {
      const result = buildFormData({
        "nominationList[game][__identity]": "game-id",
        config: {
          "special-key": {
            "__value__": "test",
          },
        },
      });
      expect(result.get("nominationList[game][__identity]")).toBe("game-id");
      expect(result.get("config[special-key][__value__]")).toBe("test");
    });

    it("handles Unicode characters in keys", () => {
      const result = buildFormData({
        "schlüssel": "wert",
        "キー": "値",
        "🔑": "value",
      });
      expect(result.get("schlüssel")).toBe("wert");
      expect(result.get("キー")).toBe("値");
      expect(result.get("🔑")).toBe("value");
    });

    it("handles empty string as key", () => {
      const result = buildFormData({
        "": "empty-key-value",
        normal: "normal-value",
      });
      expect(result.get("")).toBe("empty-key-value");
      expect(result.get("normal")).toBe("normal-value");
    });

    it("handles keys with spaces", () => {
      const result = buildFormData({
        "key with spaces": "value",
        nested: {
          "also has spaces": "nested-value",
        },
      });
      expect(result.get("key with spaces")).toBe("value");
      expect(result.get("nested[also has spaces]")).toBe("nested-value");
    });
  });

  describe("primitive value serialization", () => {
    it("converts numbers to strings", () => {
      const result = buildFormData({
        integer: 42,
        float: 3.14159,
        negative: -100,
        zero: 0,
      });
      expect(result.get("integer")).toBe("42");
      expect(result.get("float")).toBe("3.14159");
      expect(result.get("negative")).toBe("-100");
      expect(result.get("zero")).toBe("0");
    });

    it("converts booleans to strings", () => {
      const result = buildFormData({
        yes: true,
        no: false,
      });
      expect(result.get("yes")).toBe("true");
      expect(result.get("no")).toBe("false");
    });

    it("preserves string values as-is", () => {
      const result = buildFormData({
        text: "hello world",
        empty: "",
        special: "special <chars> & \"quotes\"",
      });
      expect(result.get("text")).toBe("hello world");
      expect(result.get("empty")).toBe("");
      expect(result.get("special")).toBe("special <chars> & \"quotes\"");
    });
  });
});
