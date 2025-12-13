import { describe, it, expect } from "vitest";
import { normalizeBasePath } from "@/utils/basePath";

describe("normalizeBasePath", () => {
  describe("edge cases", () => {
    it('returns "/" for undefined', () => {
      expect(normalizeBasePath(undefined)).toBe("/");
    });

    it('returns "/" for empty string', () => {
      expect(normalizeBasePath("")).toBe("/");
    });

    it('returns "/" for "/" input', () => {
      expect(normalizeBasePath("/")).toBe("/");
    });
  });

  describe("normalization", () => {
    it("adds leading and trailing slashes to bare path", () => {
      expect(normalizeBasePath("foo")).toBe("/foo/");
    });

    it("adds trailing slash when missing", () => {
      expect(normalizeBasePath("/foo")).toBe("/foo/");
    });

    it("adds leading slash when missing", () => {
      expect(normalizeBasePath("foo/")).toBe("/foo/");
    });

    it("preserves correctly formatted path", () => {
      expect(normalizeBasePath("/foo/")).toBe("/foo/");
    });

    it("handles nested paths", () => {
      expect(normalizeBasePath("foo/bar")).toBe("/foo/bar/");
      expect(normalizeBasePath("/foo/bar")).toBe("/foo/bar/");
      expect(normalizeBasePath("/foo/bar/")).toBe("/foo/bar/");
    });
  });

  describe("real-world examples", () => {
    it("normalizes GitHub Pages repo name", () => {
      expect(normalizeBasePath("volleykit")).toBe("/volleykit/");
      expect(normalizeBasePath("/volleykit")).toBe("/volleykit/");
      expect(normalizeBasePath("/volleykit/")).toBe("/volleykit/");
    });
  });
});
