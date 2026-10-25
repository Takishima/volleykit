/**
 * Narrows `value` to its non-nullable type, failing the test otherwise.
 *
 * Use it where a test reads an optional field and the assertion that follows
 * would pass vacuously with `?.` (for example comparing two optional values
 * that could both be `undefined`).
 */
export function assertDefined<T>(
  value: T,
  message = 'Expected value to be defined'
): asserts value is NonNullable<T> {
  if (value == null) {
    throw new Error(message)
  }
}
