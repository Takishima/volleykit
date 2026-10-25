/**
 * Reads the `state` slice that zustand's `persist` middleware wrote to
 * localStorage under `key`, failing the test when nothing was persisted.
 *
 * The caller names the shape it expects (usually the store's partialized
 * state), so assertions on the result are type-checked instead of reading
 * through the `any` that `JSON.parse` returns.
 */
export function readPersistedState<T>(key: string): T {
  const raw = localStorage.getItem(key)
  if (raw === null) {
    throw new Error(`Nothing persisted under "${key}"`)
  }
  const envelope: unknown = JSON.parse(raw)
  if (typeof envelope !== 'object' || envelope === null || !('state' in envelope)) {
    throw new Error(`Persisted value under "${key}" is not a zustand persist envelope`)
  }
  return envelope.state as T
}
