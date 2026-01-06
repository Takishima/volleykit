import { describe, it, expect } from "vitest";
import { normalizeBasePath } from "./basePath";

describe("normalizeBasePath", () => {
  describe("handles empty/undefined input", () => {
    it("returns '/' for undefined", () => {
      expect(normalizeBasePath(undefined)).toBe("/");
    });

    it("returns '/' for empty string", () => {
      expect(normalizeBasePath("")).toBe("/");
    });

    it("returns '/' for single slash", () => {
      expect(normalizeBasePath("/")).toBe("/");
    });
  });

  describe("normalizes paths without leading slash", () => {
    it("adds leading slash to 'foo'", () => {
      expect(normalizeBasePath("foo")).toBe("/foo/");
    });

    it("adds leading slash to 'foo/'", () => {
      expect(normalizeBasePath("foo/")).toBe("/foo/");
    });
  });

  describe("normalizes paths without trailing slash", () => {
    it("adds trailing slash to '/foo'", () => {
      expect(normalizeBasePath("/foo")).toBe("/foo/");
    });

    it("adds trailing slash to 'foo'", () => {
      expect(normalizeBasePath("foo")).toBe("/foo/");
    });
  });

  describe("preserves already normalized paths", () => {
    it("keeps '/foo/' unchanged", () => {
      expect(normalizeBasePath("/foo/")).toBe("/foo/");
    });

    it("keeps '/volleykit/' unchanged", () => {
      expect(normalizeBasePath("/volleykit/")).toBe("/volleykit/");
    });
  });

  describe("handles nested paths", () => {
    it("normalizes 'foo/bar' to '/foo/bar/'", () => {
      expect(normalizeBasePath("foo/bar")).toBe("/foo/bar/");
    });

    it("normalizes '/foo/bar' to '/foo/bar/'", () => {
      expect(normalizeBasePath("/foo/bar")).toBe("/foo/bar/");
    });

    it("keeps '/foo/bar/' unchanged", () => {
      expect(normalizeBasePath("/foo/bar/")).toBe("/foo/bar/");
    });
  });
});
