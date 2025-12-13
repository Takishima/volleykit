import { describe, it, expect } from "vitest";

/**
 * Tests for regex patterns used in PWA service worker configuration.
 * These patterns are defined in vite.config.ts navigateFallbackDenylist.
 */

describe("PWA navigateFallbackDenylist patterns", () => {
  describe("PR preview path detection", () => {
    // Pattern from vite.config.ts: /\/pr-\d+/
    const prPreviewPattern = /\/pr-\d+/;

    it("matches PR preview paths", () => {
      expect(prPreviewPattern.test("/volleykit/pr-114/")).toBe(true);
      expect(prPreviewPattern.test("/volleykit/pr-999/")).toBe(true);
      expect(prPreviewPattern.test("/volleykit/pr-1/")).toBe(true);
      expect(prPreviewPattern.test("/pr-123/")).toBe(true);
    });

    it("does not match non-PR paths", () => {
      expect(prPreviewPattern.test("/volleykit/")).toBe(false);
      expect(prPreviewPattern.test("/volleykit/assignments")).toBe(false);
      expect(prPreviewPattern.test("/pr/")).toBe(false);
      expect(prPreviewPattern.test("/pr-abc/")).toBe(false);
    });

    it("matches PR paths without trailing slash", () => {
      expect(prPreviewPattern.test("/volleykit/pr-114")).toBe(true);
    });
  });

  describe("API route patterns", () => {
    // Patterns from vite.config.ts
    const neosPattern = /\/neos/;
    const refadminPattern = /\/indoorvolleyball\.refadmin/;
    const sportmanagerPattern = /\/sportmanager\.indoorvolleyball/;

    it("matches neos API routes", () => {
      expect(neosPattern.test("/neos/api/endpoint")).toBe(true);
      expect(neosPattern.test("/volleykit/neos/api")).toBe(true);
    });

    it("matches refadmin API routes", () => {
      expect(refadminPattern.test("/indoorvolleyball.refadmin/api")).toBe(true);
    });

    it("matches sportmanager API routes", () => {
      expect(
        sportmanagerPattern.test("/sportmanager.indoorvolleyball/api"),
      ).toBe(true);
    });
  });
});
