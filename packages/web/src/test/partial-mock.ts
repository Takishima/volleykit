/**
 * Recursively optional version of `T`. Functions are kept as-is so a stub
 * such as `() => 30` is still checked against the real signature.
 */
type DeepPartial<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T

/**
 * Builds a deliberately partial test double of `T`.
 *
 * Every property that is provided is type-checked against the real `T`, so a
 * renamed field or a stale literal value fails to compile, while the omitted
 * rest is left out on purpose because the code under test does not read it.
 * The returned object is typed as the full `T` so it can be passed to a
 * selector or a mock implementation that expects the real shape.
 *
 * @example
 * vi.mocked(useSettingsStore).mockImplementation((selector) =>
 *   selector(partialMock<SettingsState>({ isSafeModeEnabled: true }))
 * )
 */
export function partialMock<T>(value: DeepPartial<T>): T {
  return value as T
}
