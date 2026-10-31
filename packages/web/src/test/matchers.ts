import { expect } from 'vitest'

/**
 * Typed views of vitest's asymmetric matchers.
 *
 * `expect.objectContaining(...)`, `expect.arrayContaining(...)` and
 * `expect.any(...)` are declared as `any`, which the type-aware lint rules
 * reject as soon as a matcher is nested inside an object literal or an array.
 * Each wrapper keeps the matcher but types it as the value it stands for, so
 * it can sit wherever that value is expected.
 *
 * @example
 * expect(api.search).toHaveBeenCalledWith(
 *   expect.objectContaining({
 *     propertyFilters: arrayContaining([objectContaining({ propertyName: 'status' })]),
 *   })
 * )
 */
const matchers: {
  objectContaining: (expected: object) => unknown
  arrayContaining: (expected: unknown[]) => unknown
  any: (constructor: unknown) => unknown
} = expect

/** `expect.objectContaining(partial)` typed as the full object it matches. */
export function objectContaining<T extends object>(partial: Partial<T>): T {
  return matchers.objectContaining(partial) as T
}

/** `expect.arrayContaining(items)` typed as the array it matches. */
export function arrayContaining<T>(items: T[]): T[] {
  return matchers.arrayContaining(items) as T[]
}

/**
 * `expect.any(constructor)` typed as the value it matches, for example
 * `anyOfType<string>(String)` or `anyOfType<() => void>(Function)`.
 */
export function anyOfType<T>(constructor: abstract new (...args: never[]) => unknown): T {
  return matchers.any(constructor) as T
}
