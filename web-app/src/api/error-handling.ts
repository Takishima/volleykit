/**
 * API error parsing utilities.
 * Handles extracting meaningful error messages from various backend response formats.
 */

import { z } from "zod";

// Backend error response schema
const backendErrorSchema = z
  .object({
    error: z.string().optional(),
    message: z.string().optional(),
    errors: z
      .array(
        z.object({
          field: z.string().optional(),
          message: z.string(),
        }),
      )
      .optional(),
  })
  .passthrough();

/**
 * Parses backend error response to extract meaningful error message.
 */
export async function parseErrorResponse(response: Response): Promise<string> {
  const status = response.status;
  const statusText = response.statusText;

  try {
    const contentType = response.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
      const data = await response.json();
      const parsed = backendErrorSchema.safeParse(data);

      if (parsed.success) {
        // Check for specific error fields
        if (parsed.data.message) {
          return parsed.data.message;
        }
        if (parsed.data.error) {
          return parsed.data.error;
        }
        if (parsed.data.errors && parsed.data.errors.length > 0) {
          return parsed.data.errors
            .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
            .join(", ");
        }
      }
    }

    // Try to get text content for non-JSON responses
    if (contentType.includes("text/")) {
      const text = await response.text();
      // Strip HTML tags repeatedly until no more remain (prevents nested tag bypass)
      let cleanText = text;
      let previousText: string;
      do {
        previousText = cleanText;
        cleanText = cleanText.replace(/<[^>]*>/g, "");
      } while (cleanText !== previousText);
      cleanText = cleanText.trim().slice(0, 200);
      if (cleanText) {
        return cleanText;
      }
    }
  } catch {
    // Failed to parse error body, fall through to default
  }

  // Default error message
  return `${status} ${statusText}`;
}
