import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseErrorResponse } from "./error-handling";

describe("parseErrorResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("JSON error responses", () => {
    it("extracts message field from JSON response", async () => {
      const response = new Response(
        JSON.stringify({ message: "Invalid credentials" }),
        {
          status: 401,
          statusText: "Unauthorized",
          headers: { "Content-Type": "application/json" },
        },
      );

      const result = await parseErrorResponse(response);
      expect(result).toBe("Invalid credentials");
    });

    it("extracts error field when message is not present", async () => {
      const response = new Response(
        JSON.stringify({ error: "Session expired" }),
        {
          status: 403,
          statusText: "Forbidden",
          headers: { "Content-Type": "application/json" },
        },
      );

      const result = await parseErrorResponse(response);
      expect(result).toBe("Session expired");
    });

    it("prefers message field over error field", async () => {
      const response = new Response(
        JSON.stringify({ message: "Primary message", error: "Secondary error" }),
        {
          status: 400,
          statusText: "Bad Request",
          headers: { "Content-Type": "application/json" },
        },
      );

      const result = await parseErrorResponse(response);
      expect(result).toBe("Primary message");
    });

    it("combines multiple field errors", async () => {
      const response = new Response(
        JSON.stringify({
          errors: [
            { field: "email", message: "Invalid email format" },
            { field: "password", message: "Password too short" },
          ],
        }),
        {
          status: 422,
          statusText: "Unprocessable Entity",
          headers: { "Content-Type": "application/json" },
        },
      );

      const result = await parseErrorResponse(response);
      expect(result).toBe("email: Invalid email format, password: Password too short");
    });

    it("handles errors without field names", async () => {
      const response = new Response(
        JSON.stringify({
          errors: [
            { message: "First error" },
            { message: "Second error" },
          ],
        }),
        {
          status: 400,
          statusText: "Bad Request",
          headers: { "Content-Type": "application/json" },
        },
      );

      const result = await parseErrorResponse(response);
      expect(result).toBe("First error, Second error");
    });

    it("handles mixed errors with and without field names", async () => {
      const response = new Response(
        JSON.stringify({
          errors: [
            { field: "username", message: "Required" },
            { message: "General validation error" },
          ],
        }),
        {
          status: 400,
          statusText: "Bad Request",
          headers: { "Content-Type": "application/json" },
        },
      );

      const result = await parseErrorResponse(response);
      expect(result).toBe("username: Required, General validation error");
    });

    it("falls back to status when JSON has no recognized fields", async () => {
      const response = new Response(
        JSON.stringify({ unknownField: "some value" }),
        {
          status: 500,
          statusText: "Internal Server Error",
          headers: { "Content-Type": "application/json" },
        },
      );

      const result = await parseErrorResponse(response);
      expect(result).toBe("500 Internal Server Error");
    });

    it("handles empty errors array", async () => {
      const response = new Response(
        JSON.stringify({ errors: [] }),
        {
          status: 400,
          statusText: "Bad Request",
          headers: { "Content-Type": "application/json" },
        },
      );

      const result = await parseErrorResponse(response);
      expect(result).toBe("400 Bad Request");
    });

    it("handles application/json with charset", async () => {
      const response = new Response(
        JSON.stringify({ message: "Error with charset" }),
        {
          status: 400,
          statusText: "Bad Request",
          headers: { "Content-Type": "application/json; charset=utf-8" },
        },
      );

      const result = await parseErrorResponse(response);
      expect(result).toBe("Error with charset");
    });
  });

  describe("text error responses", () => {
    it("extracts text from text/plain response", async () => {
      const response = new Response("Plain text error message", {
        status: 500,
        statusText: "Internal Server Error",
        headers: { "Content-Type": "text/plain" },
      });

      const result = await parseErrorResponse(response);
      expect(result).toBe("Plain text error message");
    });

    it("strips HTML tags from text/html response", async () => {
      const response = new Response(
        "<html><body><h1>Error</h1><p>Something went wrong</p></body></html>",
        {
          status: 500,
          statusText: "Internal Server Error",
          headers: { "Content-Type": "text/html" },
        },
      );

      const result = await parseErrorResponse(response);
      expect(result).toBe("ErrorSomething went wrong");
    });

    it("strips nested HTML tags to prevent bypass", async () => {
      const response = new Response(
        "<<script>script>alert('xss')<</script>/script>",
        {
          status: 500,
          statusText: "Internal Server Error",
          headers: { "Content-Type": "text/html" },
        },
      );

      const result = await parseErrorResponse(response);
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("</script>");
    });

    it("truncates long text responses to 200 characters", async () => {
      const longText = "A".repeat(300);
      const response = new Response(longText, {
        status: 500,
        statusText: "Internal Server Error",
        headers: { "Content-Type": "text/plain" },
      });

      const result = await parseErrorResponse(response);
      expect(result.length).toBe(200);
    });

    it("trims whitespace from text responses", async () => {
      const response = new Response("   Error message with spaces   ", {
        status: 400,
        statusText: "Bad Request",
        headers: { "Content-Type": "text/plain" },
      });

      const result = await parseErrorResponse(response);
      expect(result).toBe("Error message with spaces");
    });

    it("falls back to status for empty text content", async () => {
      const response = new Response("   ", {
        status: 500,
        statusText: "Internal Server Error",
        headers: { "Content-Type": "text/plain" },
      });

      const result = await parseErrorResponse(response);
      expect(result).toBe("500 Internal Server Error");
    });

    it("falls back to status for HTML-only content that becomes empty after stripping", async () => {
      const response = new Response("<br><hr><img src='x'>", {
        status: 500,
        statusText: "Internal Server Error",
        headers: { "Content-Type": "text/html" },
      });

      const result = await parseErrorResponse(response);
      expect(result).toBe("500 Internal Server Error");
    });
  });

  describe("fallback behavior", () => {
    it("returns status and statusText for unknown content type", async () => {
      const response = new Response("binary data", {
        status: 415,
        statusText: "Unsupported Media Type",
        headers: { "Content-Type": "application/octet-stream" },
      });

      const result = await parseErrorResponse(response);
      expect(result).toBe("415 Unsupported Media Type");
    });

    it("returns status and statusText when Content-Type is octet-stream", async () => {
      const response = new Response(new ArrayBuffer(8), {
        status: 500,
        statusText: "Internal Server Error",
        headers: { "Content-Type": "application/octet-stream" },
      });

      const result = await parseErrorResponse(response);
      expect(result).toBe("500 Internal Server Error");
    });

    it("handles malformed JSON gracefully", async () => {
      const response = new Response("{ invalid json", {
        status: 400,
        statusText: "Bad Request",
        headers: { "Content-Type": "application/json" },
      });

      const result = await parseErrorResponse(response);
      expect(result).toBe("400 Bad Request");
    });

    it("handles response.json() throwing an error", async () => {
      const response = new Response(null, {
        status: 500,
        statusText: "Internal Server Error",
        headers: { "Content-Type": "application/json" },
      });

      // Clone and consume the body to make json() fail
      const cloned = response.clone();
      await cloned.text(); // Consume the body

      const result = await parseErrorResponse(response);
      expect(result).toBe("500 Internal Server Error");
    });

    it("handles common HTTP status codes", async () => {
      const testCases = [
        { status: 400, statusText: "Bad Request" },
        { status: 401, statusText: "Unauthorized" },
        { status: 403, statusText: "Forbidden" },
        { status: 404, statusText: "Not Found" },
        { status: 500, statusText: "Internal Server Error" },
        { status: 502, statusText: "Bad Gateway" },
        { status: 503, statusText: "Service Unavailable" },
      ];

      for (const { status, statusText } of testCases) {
        const response = new Response(null, { status, statusText });
        const result = await parseErrorResponse(response);
        expect(result).toBe(`${status} ${statusText}`);
      }
    });
  });

  describe("edge cases", () => {
    it("handles very long error messages in JSON", async () => {
      const longMessage = "Error: " + "A".repeat(1000);
      const response = new Response(
        JSON.stringify({ message: longMessage }),
        {
          status: 400,
          statusText: "Bad Request",
          headers: { "Content-Type": "application/json" },
        },
      );

      const result = await parseErrorResponse(response);
      // JSON messages are not truncated, only text content is
      expect(result).toBe(longMessage);
    });

    it("handles unicode characters in error messages", async () => {
      const response = new Response(
        JSON.stringify({ message: "Erreur: données invalides 日本語" }),
        {
          status: 400,
          statusText: "Bad Request",
          headers: { "Content-Type": "application/json" },
        },
      );

      const result = await parseErrorResponse(response);
      expect(result).toBe("Erreur: données invalides 日本語");
    });

    it("handles special characters in field names", async () => {
      const response = new Response(
        JSON.stringify({
          errors: [
            { field: "user.email", message: "Invalid" },
            { field: "items[0].name", message: "Required" },
          ],
        }),
        {
          status: 400,
          statusText: "Bad Request",
          headers: { "Content-Type": "application/json" },
        },
      );

      const result = await parseErrorResponse(response);
      expect(result).toBe("user.email: Invalid, items[0].name: Required");
    });
  });
});
