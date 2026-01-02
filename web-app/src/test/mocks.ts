/**
 * Shared mock patterns for tests.
 *
 * Due to Vitest's hoisting of vi.mock(), these cannot be directly imported
 * into test files. Instead, use vi.hoisted() to define mocks inline.
 *
 * Example usage in test files:
 *
 * ```typescript
 * // Mock useTour to disable tour mode during tests
 * const mockUseTour = vi.hoisted(() => ({
 *   useTour: () => ({
 *     isActive: false,
 *     isTourMode: false,
 *     showDummyData: false,
 *     startTour: vi.fn(),
 *     endTour: vi.fn(),
 *     currentStep: 0,
 *     nextStep: vi.fn(),
 *     shouldShow: false,
 *   }),
 * }));
 *
 * vi.mock("@/hooks/useTour", () => mockUseTour);
 * ```
 */

/**
 * Default values for useTour mock.
 * Copy this pattern into test files using vi.hoisted().
 */
export const USE_TOUR_MOCK_DEFAULTS = {
  isActive: false,
  isTourMode: false,
  showDummyData: false,
  currentStep: 0,
  shouldShow: false,
} as const;
