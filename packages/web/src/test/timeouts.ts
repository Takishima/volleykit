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
 * Nothing in this file may name a DOM or vitest ambient type. tsconfig.app.json
 * excludes src/test/**, and tsconfig.node.json includes only vite.config.ts, so
 * this module is typechecked solely as a followed import of the node project:
 * lib ES2023, types node, no DOM.
 *
 * Importing is not the constraint — skipLibCheck hides what
 * @testing-library/react and vitest need inside their own .d.ts, and both
 * import clean. What breaks is this file's own source naming a type it has no
 * lib for: `export type E = HTMLElement` is TS2304 "Cannot find name
 * 'HTMLElement'", reported here at the line that names it. (Verified by
 * running `tsc -b` against each case.)
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
 * This is preventive, and the derivation is what makes it so: a waitFor inside
 * a hook spends the assertion budget against the hook budget, so had this been
 * left at Vitest's 10s default, a later raise of ASYNC_UTIL_TIMEOUT_MS to 10000
 * would have recreated the equality above — silently, and only for hooks.
 */
export const HOOK_TIMEOUT_MS = TEST_TIMEOUT_MS
