/**
 * Error classification type for error boundaries.
 * Network errors typically allow retry, while application errors may need a refresh.
 */
export type ErrorType = "network" | "application";

/**
 * Classify an error as network-related or application-related.
 * Network errors typically allow retry, while application errors may need a refresh.
 */
export function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Network-related errors
  if (
    (name === "typeerror" && message.includes("fetch")) ||
    name === "networkerror" ||
    message.includes("network") ||
    message.includes("failed to fetch") ||
    message.includes("connection") ||
    message.includes("timeout") ||
    message.includes("cors") ||
    message.includes("offline")
  ) {
    return "network";
  }

  return "application";
}
