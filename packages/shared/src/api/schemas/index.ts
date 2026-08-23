/**
 * API response schemas, grouped by domain.
 *
 * `validation.ts` re-exports this barrel so existing
 * `@volleykit/shared/api` imports keep working unchanged.
 */
export * from './primitives'
export * from './resilient-list'
export * from './common'
export * from './convocations'
export * from './games'
export * from './settings'
export * from './backup'
