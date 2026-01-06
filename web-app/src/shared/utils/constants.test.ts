import { describe, it, expect, vi, afterEach } from "vitest";
import { getHelpSiteUrl } from "./constants";

describe("getHelpSiteUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns help URL with correct base path for production", () => {
    // Production: origin is GitHub Pages, BASE_URL is /volleykit/
    vi.stubGlobal("window", {
      location: { origin: "https://takishima.github.io" },
    });
    vi.stubEnv("BASE_URL", "/volleykit/");

    const url = getHelpSiteUrl();

    expect(url).toBe("https://takishima.github.io/volleykit/help/");
  });

  it("returns help URL with correct base path for PR preview", () => {
    // PR preview: origin is GitHub Pages, BASE_URL is /volleykit/pr-123/
    vi.stubGlobal("window", {
      location: { origin: "https://takishima.github.io" },
    });
    vi.stubEnv("BASE_URL", "/volleykit/pr-123/");

    const url = getHelpSiteUrl();

    expect(url).toBe("https://takishima.github.io/volleykit/pr-123/help/");
  });

  it("returns help URL for local development", () => {
    // Local dev: origin is localhost, BASE_URL is /
    vi.stubGlobal("window", {
      location: {
        origin: "http://localhost:5173",
      },
    });
    vi.stubEnv("BASE_URL", "/");

    const url = getHelpSiteUrl();

    expect(url).toBe("http://localhost:5173/help/");
  });

  it("handles missing window (SSR) gracefully", () => {
    // SSR/Node: window is undefined
    vi.stubGlobal("window", undefined);
    vi.stubEnv("BASE_URL", "/volleykit/");

    const url = getHelpSiteUrl();

    expect(url).toBe("/volleykit/help/");
  });
});
