/**
 * Demo assignment generators for creating sample assignment data.
 */
/* eslint-disable @typescript-eslint/no-magic-numbers -- Demo data uses hardcoded IDs and indices */

import { addDays, addHours, subDays } from 'date-fns'

import type { Assignment } from '@/api/client'
import { type RefereePosition } from '@/features/compensations/utils/demo-compensation'
import { generateDemoUuid } from '@/shared/utils/demo-uuid'

import {
  type DemoAssociationCode,
  type LinesmanPosition,
  DEMO_GAME_NUMBERS,
  getLeaguesForAssociation,
  addOfficialsToConfig,
  createRefereeGame,
} from './shared'

interface AssignmentConfig {
  index: number
  status: 'active' | 'cancelled' | 'archived'
  position: RefereePosition
  confirmationStatus: 'confirmed' | 'pending'
  confirmationDaysAgo: number | null
  gameDate: Date
  venueIndex: number
  leagueIndex: number
  gender: 'm' | 'f'
  isGameInFuture: boolean
  isOpenInExchange?: boolean
  hasMessage?: boolean
  linkedDouble?: string
  /** Whether games in this group require no scoresheet upload */
  hasNoScoresheet?: boolean
  /** Whether this is a tournament group */
  isTournamentGroup?: boolean
  /** Whether to include second head referee */
  hasSecondHeadReferee?: boolean
  /** Which linesman positions are assigned for this game (1-4) */
  linesmenPositions?: LinesmanPosition[]
}

export function createAssignment(
  config: AssignmentConfig,
  associationCode: DemoAssociationCode,
  now: Date
): Assignment {
  // Regional associations use on-site payout, which locks compensation editing
  const lockPayoutOnSiteCompensation = associationCode !== 'SV'

  return {
    __identity: generateDemoUuid(`demo-assignment-${config.index}`),
    refereeConvocationStatus: config.status,
    refereePosition: config.position,
    confirmationStatus: config.confirmationStatus,
    confirmationDate:
      config.confirmationDaysAgo !== null
        ? subDays(now, config.confirmationDaysAgo).toISOString()
        : null,
    isOpenEntryInRefereeGameExchange: config.isOpenInExchange ?? false,
    hasLastMessageToReferee: config.hasMessage ?? false,
    hasLinkedDoubleConvocation: !!config.linkedDouble,
    ...(config.linkedDouble && {
      linkedDoubleConvocationGameNumberAndRefereePosition: config.linkedDouble,
    }),
    // Compensation lock flags for editability check
    convocationCompensation: {
      paymentDone: false,
      lockPayoutOnSiteCompensation,
    },
    refereeGame: createRefereeGame({
      gameId: String(config.index),
      gameNumber: DEMO_GAME_NUMBERS.ASSIGNMENTS[config.index - 1]!,
      gameDate: config.gameDate,
      venueIndex: config.venueIndex,
      leagueIndex: config.leagueIndex,
      gender: config.gender,
      isGameInFuture: config.isGameInFuture,
      associationCode,
      idPrefix: 'demo',
      hasNoScoresheet: config.hasNoScoresheet,
      isTournamentGroup: config.isTournamentGroup,
      hasSecondHeadReferee: config.hasSecondHeadReferee,
      linesmenPositions: config.linesmenPositions,
    }),
  }
}

export function generateAssignments(associationCode: DemoAssociationCode, now: Date): Assignment[] {
  const leagues = getLeaguesForAssociation(associationCode)

  const configs: AssignmentConfig[] = [
    // NLA/1L men - head referee, with computed officials
    {
      index: 1,
      status: 'active',
      position: 'head-one',
      confirmationStatus: 'confirmed',
      confirmationDaysAgo: 5,
      gameDate: addDays(now, 2),
      venueIndex: 0,
      leagueIndex: 0,
      gender: 'm',
      isGameInFuture: true,
    },
    // NLA for SV (linesman assignment), 1L for regional - linesman position only makes sense for NLA
    {
      index: 2,
      status: 'active',
      position: 'linesman-one',
      confirmationStatus: 'confirmed',
      confirmationDaysAgo: 3,
      gameDate: addHours(now, 3),
      venueIndex: 1,
      leagueIndex: 0,
      gender: 'm',
      isGameInFuture: true,
      hasMessage: true,
    },
    // NLA/1L women - head referee
    {
      index: 3,
      status: 'active',
      position: 'head-two',
      confirmationStatus: 'pending',
      confirmationDaysAgo: null,
      gameDate: addDays(now, 5),
      venueIndex: 2,
      leagueIndex: 0,
      gender: 'f',
      isGameInFuture: true,
      linkedDouble: '382420 / ARB 1',
    },
    // NLB for SV, 3L for regional - women (3L women have only 1st ref)
    {
      index: 4,
      status: 'cancelled',
      position: 'head-one',
      confirmationStatus: 'confirmed',
      confirmationDaysAgo: 10,
      gameDate: addDays(now, 7),
      venueIndex: 3,
      leagueIndex: associationCode === 'SV' ? 1 : 2,
      gender: 'f',
      isGameInFuture: true,
      isOpenInExchange: true,
    },
    // NLA for SV (linesman assignment), 3L for regional
    {
      index: 5,
      status: 'archived',
      position: 'linesman-two',
      confirmationStatus: 'confirmed',
      confirmationDaysAgo: 14,
      gameDate: subDays(now, 3),
      venueIndex: 0,
      leagueIndex: associationCode === 'SV' ? 0 : 2,
      gender: 'm',
      isGameInFuture: false,
    },
    // NLB in single-ball hall (Däniken Erlimatt) - only for SV to showcase single-ball indicator
    ...(associationCode === 'SV'
      ? [
          {
            index: 6,
            status: 'active' as const,
            position: 'head-one' as const,
            confirmationStatus: 'confirmed' as const,
            confirmationDaysAgo: 2,
            gameDate: addDays(now, 3),
            venueIndex: 4,
            leagueIndex: 1,
            gender: 'm' as const,
            isGameInFuture: true,
          },
        ]
      : []),
  ]

  return configs.map((config) =>
    createAssignment(addOfficialsToConfig(config, leagues), associationCode, now)
  )
}

/**
 * Demo calendar assignment for conflict detection.
 * Matches the CalendarAssignment type from the iCal parser.
 */
export interface DemoCalendarAssignment {
  gameId: string
  gameNumber: number | null
  role: 'referee1' | 'referee2' | 'lineReferee' | 'scorer' | 'unknown'
  roleRaw: string
  startTime: string
  endTime: string
  homeTeam: string
  awayTeam: string
  league: string
  leagueCategory: string | null
  address: string | null
  coordinates: { latitude: number; longitude: number } | null
  hallName: string | null
  hallId: string | null
  gender: 'men' | 'women' | 'mixed' | 'unknown'
  mapsUrl: string | null
  plusCode: string | null
  referees: {
    referee1?: string
    referee2?: string
    lineReferee1?: string
    lineReferee2?: string
  }
  association: string | null
}

/**
 * Generates demo calendar assignments with scheduling conflicts.
 *
 * IMPORTANT: The gameId values MUST match the demo assignment game IDs
 * (generated from 'demo-g-{index}') for conflict detection to work.
 * The conflict map uses gameId as the key, and AssignmentCard looks up
 * conflicts using refereeGame.game.__identity.
 *
 * Creates assignments that match the demo assignments page, plus an
 * additional cross-association conflict from SVRZ.
 *
 * @param now - Current date/time for relative date calculations
 * @returns Array of CalendarAssignment objects with intentional conflicts
 */
export function generateDemoCalendarAssignments(now = new Date()): DemoCalendarAssignment[] {
  // Assignment 1: 2 days from now at 14:00, ends ~16:00 (SV)
  // This matches demo assignment index 1
  const game1Start = addDays(now, 2)
  game1Start.setHours(14, 0, 0, 0)
  const game1End = new Date(game1Start)
  game1End.setHours(16, 0, 0, 0)

  // Assignment 2: Today + 3 hours (SV)
  // This matches demo assignment index 2
  const game2Start = addHours(now, 3)
  // Round to nearest hour for cleaner display
  game2Start.setMinutes(0, 0, 0)
  const game2End = new Date(game2Start)
  game2End.setHours(game2Start.getHours() + 2, 0, 0, 0)

  // Assignment 3: 5 days from now (SV)
  // This matches demo assignment index 3
  const game3Start = addDays(now, 5)
  game3Start.setHours(18, 0, 0, 0)
  const game3End = new Date(game3Start)
  game3End.setHours(20, 0, 0, 0)

  // Cross-association conflict: SVRZ game 30 min after assignment 1 ends
  // This creates a conflict with assignment 1 (only 30 min gap < 60 min threshold)
  const conflictStart = addDays(now, 2)
  conflictStart.setHours(16, 30, 0, 0)
  const conflictEnd = new Date(conflictStart)
  conflictEnd.setHours(18, 30, 0, 0)

  return [
    // Assignment 1: Matches demo-g-1 (2 days from now)
    {
      gameId: generateDemoUuid('demo-g-1'),
      gameNumber: DEMO_GAME_NUMBERS.ASSIGNMENTS[0],
      role: 'referee1',
      roleRaw: 'ARB 1',
      startTime: game1Start.toISOString(),
      endTime: game1End.toISOString(),
      homeTeam: 'NLZ Volleyball Academy',
      awayTeam: 'Volley Luzern',
      league: 'NLA Herren',
      leagueCategory: 'NLA',
      address: 'Talacherstrasse 2, 8302 Kloten',
      coordinates: { latitude: 47.462187, longitude: 8.577813 },
      hallName: 'Sporthalle Ruebisbach',
      hallId: '3661',
      gender: 'men',
      mapsUrl: 'https://maps.google.com/?q=47.462187,8.577813',
      plusCode: '8FVCFH6H+V4',
      referees: { referee1: 'Demo User', referee2: 'Thomas Meier' },
      association: 'SV',
    },
    // Cross-association conflict from SVRZ - 30 min after assignment 1 ends
    // This will show as a conflict on assignment 1's card
    {
      gameId: generateDemoUuid('demo-cal-conflict'),
      gameNumber: 392001,
      role: 'referee2',
      roleRaw: 'ARB 2',
      startTime: conflictStart.toISOString(),
      endTime: conflictEnd.toISOString(),
      homeTeam: 'VBC Zürich',
      awayTeam: 'VBC Winterthur',
      league: '2L Herren',
      leagueCategory: '2L',
      address: 'Wallisellerstrasse 57, 8050 Zürich',
      coordinates: { latitude: 47.405062, longitude: 8.551313 },
      hallName: 'Sporthalle Oerlikon',
      hallId: '3663',
      gender: 'men',
      mapsUrl: 'https://maps.google.com/?q=47.405062,8.551313',
      plusCode: null,
      referees: { referee1: 'Thomas Weber', referee2: 'Demo User' },
      association: 'SVRZ',
    },
    // Assignment 2: Matches demo-g-2 (today + 3 hours)
    {
      gameId: generateDemoUuid('demo-g-2'),
      gameNumber: DEMO_GAME_NUMBERS.ASSIGNMENTS[1],
      role: 'lineReferee',
      roleRaw: 'LR 1',
      startTime: game2Start.toISOString(),
      endTime: game2End.toISOString(),
      homeTeam: 'Volley Schönenwerd',
      awayTeam: 'Traktor Basel',
      league: 'NLA Herren',
      leagueCategory: 'NLA',
      address: 'Aarestrasse 20, 5012 Schönenwerd',
      coordinates: { latitude: 47.379687, longitude: 8.004062 },
      hallName: 'Betoncoupe Arena',
      hallId: '3662',
      gender: 'men',
      mapsUrl: 'https://maps.google.com/?q=47.379687,8.004062',
      plusCode: '8FVC92H3+VJ',
      referees: {
        referee1: 'Sandra Keller',
        referee2: 'Michael Fischer',
        lineReferee1: 'Demo User',
      },
      association: 'SV',
    },
    // Assignment 3: Matches demo-g-3 (5 days from now)
    {
      gameId: generateDemoUuid('demo-g-3'),
      gameNumber: DEMO_GAME_NUMBERS.ASSIGNMENTS[2],
      role: 'referee2',
      roleRaw: 'ARB 2',
      startTime: game3Start.toISOString(),
      endTime: game3End.toISOString(),
      homeTeam: 'Volley Näfels',
      awayTeam: 'Volero Zürich',
      league: 'NLA Damen',
      leagueCategory: 'NLA',
      address: 'Oberurnerstrasse 14, 8752 Näfels',
      coordinates: { latitude: 47.108062, longitude: 9.065563 },
      hallName: 'Lintharena',
      hallId: '3664',
      gender: 'women',
      mapsUrl: 'https://maps.google.com/?q=47.108062,9.065563',
      plusCode: '8FVF4358+66',
      referees: { referee1: 'Laura Brunner', referee2: 'Demo User' },
      association: 'SV',
    },
  ]
}
