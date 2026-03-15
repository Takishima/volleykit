/**
 * Demo data generators for creating sample assignments, compensations, exchanges, etc.
 * These generators create deterministic mock data for demo mode.
 *
 * This barrel file re-exports everything that was previously exported from demo-generators.ts.
 */

export type { DemoAssociationCode } from './shared'

export { generateAssignments } from './assignments'
export type { DemoCalendarAssignment } from './assignments'
export { generateDemoCalendarAssignments } from './assignments'

export { generateCompensations, updateCompensationRecord } from './compensations'

export { generateExchanges } from './exchanges'

export {
  generatePossiblePlayers,
  generateScorers,
  generateDummyData,
  generateMockNominationLists,
} from './nominations'
export type { MockNominationLists } from './nominations'
