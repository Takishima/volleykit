/**
 * Timeouts shared between the Vitest config and the Testing Library setup.
 *
 * The ordering is the invariant, not the individual values: the assertion
 * budget must stay strictly below the test budget. If they are equal — as they
 * were when asyncUtilTimeout was raised to Vitest's 5s default — the test is
 * killed at the instant waitFor would have given up, and every waitFor/findBy*
 * failure reports a bare "Test timed out" instead of the query and DOM dump.
 *
 * Deriving one from the other keeps that structural rather than editorial, so
 * editing a single number cannot silently reintroduce the equality.
 */

/**
 * Budget for waitFor/findBy* assertions.
 *
 * Testing Library defaults to 1s, which suites rendering lazy() trees can
 * exceed on a loaded CI runner purely from chunk resolution — a timeout, not a
 * real failure.
 *
 * Sized against the worst case measured locally: several lazy() suites running
 * in parallel under heavy CPU contention pushed cold resolution past 3s. A
 * single suite under the same contention only needed ~1.2s, so calibrating
 * against one file underestimates it.
 */
export const ASYNC_UTIL_TIMEOUT_MS = 6000

/** Room for whatever a test does before reaching its first assertion. */
const TEST_TIMEOUT_HEADROOM_MS = 7000

/** Budget for a whole test. Must exceed ASYNC_UTIL_TIMEOUT_MS. */
export const TEST_TIMEOUT_MS = ASYNC_UTIL_TIMEOUT_MS + TEST_TIMEOUT_HEADROOM_MS
