/**
 * Demo data generators for creating sample assignments, compensations, exchanges, etc.
 * These generators create deterministic mock data for demo mode.
 *
 * This barrel file re-exports everything that was previously exported from demo-generators.ts.
 */

export type { DemoAssociationCode } from './shared'

export { generateDemoCalendarAssignments } from './assignments'

export { updateCompensationRecord } from './compensations'

export { generateDummyData, generateMockNominationLists } from './nominations'
export type { MockNominationLists } from './nominations'
