/**
 * Mutable holder for a value captured inside a callback, such as an MSW
 * request handler.
 *
 * `let captured: T | null = null` does not work for this: control-flow
 * analysis narrows the variable to `null` at the declaration and cannot see
 * the assignment inside the callback, so `captured?.get(...)` is typed as
 * `never`. Writing to a property of an object keeps the declared type.
 *
 * @example
 * const capturedBody = createCapture<URLSearchParams>()
 * server.use(
 *   http.post('/path', async ({ request }) => {
 *     capturedBody.value = new URLSearchParams(await request.text())
 *     return HttpResponse.json({})
 *   })
 * )
 * expect(capturedBody.value?.get('key')).toBe('value')
 */
interface Capture<T> {
  value: T | null
}

export function createCapture<T>(): Capture<T> {
  return { value: null }
}
