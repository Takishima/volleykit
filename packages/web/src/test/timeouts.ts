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
 *
 * Keep this module import-free. tsconfig.app.json excludes src/test/**, and
 * tsconfig.node.json includes only vite.config.ts, so this file is typechecked
 * solely as a followed import of the node project — no DOM lib, no vitest
 * types. Importing @testing-library/react or a vitest type here fails
 * `tsc -b` with an error pointing at the build config rather than at this file.
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

/**
 * Budget for beforeAll/afterAll/beforeEach/afterEach.
 *
 * Derived rather than left at Vitest's default so all three budgets move
 * together. Hooks await the same cold dynamic imports tests do — the shared
 * setup preloads translations and date locales in a beforeAll — so the hook
 * budget wants the headroom the assertion budget was measured against.
 *
 * Nothing is broken at the current values (6s assertion, 10s hook default).
 * This is preventive: a waitFor inside a hook spends the assertion budget
 * against this one, so a later raise of ASYNC_UTIL_TIMEOUT_MS to the 10s
 * default would recreate the equality above, silently and only for hooks.
 */
export const HOOK_TIMEOUT_MS = TEST_TIMEOUT_MS
