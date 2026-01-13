/**
 * Platform-agnostic API client
 *
 * This will be extracted from web-app/src/api/client.ts
 * Placeholder for now - implementation in Phase 2
 */

export interface ApiClientConfig {
  baseUrl: string;
  proxyUrl?: string;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export type ApiResult<T> = { data: T; error: null } | { data: null; error: ApiError };

// Placeholder - will be populated in Phase 2 (T010)
export const createApiClient = (_config: ApiClientConfig) => {
  // Implementation to be extracted from web-app
  return {
    // API methods will be added here
  };
};
