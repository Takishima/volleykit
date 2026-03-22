/**
 * Shared utilities, types, and constants used by multiple demo generators.
 */
/* eslint-disable @typescript-eslint/no-magic-numbers -- Demo data uses hardcoded IDs and indices */

import type { RefereeGame } from '@/api/client'
import { generateDemoUuid } from '@/common/utils/demo-uuid'

// Valid association codes for demo mode
// SV = Swiss Volley (national), SVRBA = Regional Basel, SVRZ = Regional Zurich
export type DemoAssociationCode = 'SV' | 'SVRBA' | 'SVRZ'

// Demo game numbers for assignments, compensations, and exchanges
export const DEMO_GAME_NUMBERS = {
  ASSIGNMENTS: [382417, 382418, 382419, 382420, 382421, 382422] as const,
  COMPENSATIONS: [382500, 382501, 382502, 382503, 382504] as const,
  EXCHANGES: [382600, 382601, 382602, 382603, 382604] as const,
} as const

// Starting team identifier for auto-incrementing IDs
export const BASE_TEAM_IDENTIFIER = 59591

type Weekday = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat'

export function getWeekday(date: Date): Weekday {
  const days = [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
  ] as const satisfies readonly Weekday[]
  return days[date.getDay()]!
}

export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]!
}

interface AddressParams {
  id: string
  street?: string
  houseNumber?: string
  postalCode: string
  city: string
  latitude?: number
  longitude?: number
  plusCode?: string
}

export function createAddress({
  id,
  street,
  houseNumber,
  postalCode,
  city,
  latitude,
  longitude,
  plusCode,
}: AddressParams) {
  // Build streetAndHouseNumber if both parts are available
  const streetAndHouseNumber = street && houseNumber ? `${street} ${houseNumber}` : undefined

  // combinedAddress in real API often just contains street, but we build full here
  const combinedAddress = streetAndHouseNumber
    ? `${streetAndHouseNumber}, ${postalCode} ${city}`
    : `${postalCode} ${city}`

  return {
    __identity: id,
    ...(street && { street }),
    ...(houseNumber && { houseNumber }),
    postalCode,
    city,
    ...(streetAndHouseNumber && { streetAndHouseNumber }),
    combinedAddress,
    ...(latitude !== undefined &&
      longitude !== undefined && {
        geographicalLocation: {
          __identity: `geo-${id}`,
          latitude,
          longitude,
          ...(plusCode && { plusCode }),
        },
      }),
  }
}

// League categories available by association type
export interface LeagueConfig {
  name: string
  identifier: number
}

export const SV_LEAGUES: LeagueConfig[] = [
  { name: 'NLA', identifier: 1 },
  { name: 'NLB', identifier: 2 },
]

export const REGIONAL_LEAGUES: LeagueConfig[] = [
  { name: '1L', identifier: 3 },
  { name: '2L', identifier: 4 },
  { name: '3L', identifier: 5 },
]

export function getLeaguesForAssociation(associationCode: DemoAssociationCode): LeagueConfig[] {
  return associationCode === 'SV' ? SV_LEAGUES : REGIONAL_LEAGUES
}

/**
 * Determines the required officials for a game based on league and gender.
 * - 3L women: only 1st referee
 * - 3L men and above: 1st and 2nd referee
 * - NLA: 1st and 2nd referee + 2 line judges
 */
export interface RequiredOfficials {
  hasSecondHeadReferee: boolean
  linesmenPositions: LinesmanPosition[]
}

export function getRequiredOfficials(leagueName: string, gender: 'm' | 'f'): RequiredOfficials {
  // NLA games have 2 head refs + 2 line judges
  if (leagueName === 'NLA') {
    return {
      hasSecondHeadReferee: true,
      linesmenPositions: [1, 2],
    }
  }

  // 3L women only have 1st referee
  if (leagueName === '3L' && gender === 'f') {
    return {
      hasSecondHeadReferee: false,
      linesmenPositions: [],
    }
  }

  // All other leagues (NLB, 1L, 2L, 3L men) have 2 head referees
  return {
    hasSecondHeadReferee: true,
    linesmenPositions: [],
  }
}

/** Base interface for configs that can have officials added */
interface ConfigWithOfficials {
  leagueIndex: number
  gender: 'm' | 'f'
  hasSecondHeadReferee?: boolean
  linesmenPositions?: LinesmanPosition[]
}

/** Add official configuration (refs/linesmen) to a config based on league requirements */
export function addOfficialsToConfig<T extends ConfigWithOfficials>(
  config: T,
  leagues: readonly LeagueConfig[]
): T {
  const league = leagues[config.leagueIndex % leagues.length]!
  const officials = getRequiredOfficials(league.name, config.gender)
  return {
    ...config,
    hasSecondHeadReferee: officials.hasSecondHeadReferee,
    linesmenPositions: officials.linesmenPositions,
  }
}

// Configuration for venue/team data based on association type
export interface VenueConfig {
  teamHome: { name: string; identifier: number }
  teamAway: { name: string; identifier: number }
  hall: {
    name: string
    street: string
    houseNumber: string
    postalCode: string
    city: string
    latitude: number
    longitude: number
    plusCode: string
  }
}

export const SV_VENUES: VenueConfig[] = [
  {
    teamHome: { name: 'NLZ Volleyball Academy', identifier: BASE_TEAM_IDENTIFIER },
    teamAway: { name: 'Volley Luzern', identifier: BASE_TEAM_IDENTIFIER + 1 },
    hall: {
      name: 'Sporthalle Ruebisbach',
      street: 'Talacherstrasse',
      houseNumber: '2',
      postalCode: '8302',
      city: 'Kloten',
      latitude: 47.462187,
      longitude: 8.577813,
      plusCode: '8FVCFH6H+V4',
    },
  },
  {
    teamHome: { name: 'Volley Schönenwerd', identifier: BASE_TEAM_IDENTIFIER + 2 },
    teamAway: { name: 'Traktor Basel', identifier: BASE_TEAM_IDENTIFIER + 3 },
    hall: {
      name: 'Betoncoupe Arena',
      street: 'Aarestrasse',
      houseNumber: '20',
      postalCode: '5012',
      city: 'Schönenwerd',
      latitude: 47.379687,
      longitude: 8.004062,
      plusCode: '8FVC92H3+VJ',
    },
  },
  {
    teamHome: { name: 'Volley Näfels', identifier: BASE_TEAM_IDENTIFIER + 4 },
    teamAway: { name: 'Volero Zürich', identifier: BASE_TEAM_IDENTIFIER + 5 },
    hall: {
      name: 'Lintharena',
      street: 'Oberurnerstrasse',
      houseNumber: '14',
      postalCode: '8752',
      city: 'Näfels',
      latitude: 47.108062,
      longitude: 9.065563,
      plusCode: '8FVF4358+66',
    },
  },
  {
    teamHome: { name: 'BTV Aarau', identifier: BASE_TEAM_IDENTIFIER + 6 },
    teamAway: { name: 'TV Schönenwerd', identifier: BASE_TEAM_IDENTIFIER + 7 },
    hall: {
      name: 'Berufsschule BSA',
      street: 'Tellistrasse',
      houseNumber: '58',
      postalCode: '5001',
      city: 'Aarau',
      latitude: 47.396438,
      longitude: 8.057063,
      plusCode: '8FVC93W4+HR',
    },
  },
  // Single-ball hall venue for demo (matches SINGLE_BALL_HALLS entry for Däniken)
  {
    teamHome: { name: 'Volley Schönenwerd NLB', identifier: BASE_TEAM_IDENTIFIER + 8 },
    teamAway: { name: 'VBC Einsiedeln', identifier: BASE_TEAM_IDENTIFIER + 9 },
    hall: {
      name: 'Mehrzweckhalle Erlimatt',
      street: 'Erlimattstrasse',
      houseNumber: '17',
      postalCode: '4658',
      city: 'Däniken',
      latitude: 47.353312,
      longitude: 7.988187,
      plusCode: '8FVC82PJ+4C',
    },
  },
]

export const SVRBA_VENUES: VenueConfig[] = [
  {
    teamHome: { name: 'VB Therwil', identifier: BASE_TEAM_IDENTIFIER },
    teamAway: { name: 'VBC Münchenstein', identifier: BASE_TEAM_IDENTIFIER + 1 },
    hall: {
      name: '99er Sporthalle',
      street: 'Schulgasse',
      houseNumber: '1C',
      postalCode: '4106',
      city: 'Therwil',
      latitude: 47.499688,
      longitude: 7.550438,
      plusCode: '8FV9FHX2+V5',
    },
  },
  {
    teamHome: { name: 'KTV Riehen', identifier: BASE_TEAM_IDENTIFIER + 2 },
    teamAway: { name: 'VB Binningen', identifier: BASE_TEAM_IDENTIFIER + 3 },
    hall: {
      name: 'Sporthalle Niederholz',
      street: 'Niederholzstrasse',
      houseNumber: '95',
      postalCode: '4125',
      city: 'Riehen',
      latitude: 47.571562,
      longitude: 7.635188,
      plusCode: '8FV9HJCP+J3',
    },
  },
  {
    teamHome: { name: 'City Volley Basel', identifier: BASE_TEAM_IDENTIFIER + 4 },
    teamAway: { name: 'TV Liestal', identifier: BASE_TEAM_IDENTIFIER + 5 },
    hall: {
      name: 'Margarethenhalle',
      street: 'Gempenstrasse',
      houseNumber: '48',
      postalCode: '4053',
      city: 'Basel',
      latitude: 47.54375,
      longitude: 7.58625,
      plusCode: '8FV9GHVP+GF',
    },
  },
]

export const SVRZ_VENUES: VenueConfig[] = [
  {
    teamHome: { name: 'KSC Wiedikon', identifier: BASE_TEAM_IDENTIFIER },
    teamAway: { name: 'Volley Oerlikon', identifier: BASE_TEAM_IDENTIFIER + 1 },
    hall: {
      name: 'Kantonsschule Wiedikon',
      street: 'Schrennengasse',
      houseNumber: '7',
      postalCode: '8003',
      city: 'Zürich',
      latitude: 47.368437,
      longitude: 8.516813,
      plusCode: '8FVC9G98+9P',
    },
  },
  {
    teamHome: { name: 'VBC Spada Academica', identifier: BASE_TEAM_IDENTIFIER + 2 },
    teamAway: { name: 'VBC Züri Unterland', identifier: BASE_TEAM_IDENTIFIER + 3 },
    hall: {
      name: 'ASVZ Sport Center Gloriarank',
      street: 'Gloriastrasse',
      houseNumber: '32',
      postalCode: '8006',
      city: 'Zürich',
      latitude: 47.376812,
      longitude: 8.553187,
      plusCode: '8FVC9HG3+P7',
    },
  },
  {
    teamHome: { name: 'VC Tornado Adliswil', identifier: BASE_TEAM_IDENTIFIER + 4 },
    teamAway: { name: 'VBC Thalwil', identifier: BASE_TEAM_IDENTIFIER + 5 },
    hall: {
      name: 'Schulhaus Hofern',
      street: 'Sonnenbergstrasse',
      houseNumber: '28',
      postalCode: '8134',
      city: 'Adliswil',
      latitude: 47.310688,
      longitude: 8.519813,
      plusCode: '8FVC8G69+7W',
    },
  },
]

export function getVenuesForAssociation(associationCode: DemoAssociationCode): VenueConfig[] {
  switch (associationCode) {
    case 'SV':
      return SV_VENUES
    case 'SVRBA':
      return SVRBA_VENUES
    case 'SVRZ':
      return SVRZ_VENUES
  }
}

// Mock referee names for demo data
// First HEAD_REFEREE_COUNT are used for head referees, rest for linesmen
export const HEAD_REFEREE_COUNT = 2
export const MOCK_REFEREES = [
  { firstName: 'Thomas', lastName: 'Meier' },
  { firstName: 'Sandra', lastName: 'Keller' },
  { firstName: 'Michael', lastName: 'Fischer' },
  { firstName: 'Laura', lastName: 'Brunner' },
  { firstName: 'Stefan', lastName: 'Huber' },
  { firstName: 'Nina', lastName: 'Baumann' },
  { firstName: 'Peter', lastName: 'Schmid' },
  { firstName: 'Anna', lastName: 'Weber' },
] as const

export function createRefereeConvocation(
  idPrefix: string,
  gameId: string,
  position: 'first' | 'second',
  refereeIndex: number
) {
  const referee = MOCK_REFEREES[refereeIndex % MOCK_REFEREES.length]!
  const displayName = `${referee.firstName} ${referee.lastName}`
  return {
    indoorAssociationReferee: {
      indoorReferee: {
        person: {
          __identity: generateDemoUuid(`${idPrefix}-referee-${position}-${gameId}`),
          firstName: referee.firstName,
          lastName: referee.lastName,
          displayName,
        },
      },
    },
  }
}

/** Linesman position (1-4) */
export type LinesmanPosition = 1 | 2 | 3 | 4

interface RefereeGameParams {
  gameId: string
  gameNumber: number
  gameDate: Date
  venueIndex: number
  leagueIndex: number
  gender: 'm' | 'f'
  isGameInFuture: boolean
  associationCode: DemoAssociationCode
  idPrefix: string
  /** Whether games in this group require no scoresheet upload */
  hasNoScoresheet?: boolean
  /** Whether this is a tournament group */
  isTournamentGroup?: boolean
  /** Whether to include second head referee (defaults to true) */
  hasSecondHeadReferee?: boolean
  /** Which linesman positions to populate (1-4) */
  linesmenPositions?: LinesmanPosition[]
}

export function createRefereeGame({
  gameId,
  gameNumber,
  gameDate,
  venueIndex,
  leagueIndex,
  gender,
  isGameInFuture,
  associationCode,
  idPrefix,
  hasNoScoresheet = false,
  isTournamentGroup = false,
  hasSecondHeadReferee = true,
  linesmenPositions = [],
}: RefereeGameParams): RefereeGame {
  const venues = getVenuesForAssociation(associationCode)
  const leagues = getLeaguesForAssociation(associationCode)
  const venue = venues[venueIndex % venues.length]!
  const league = leagues[leagueIndex % leagues.length]!

  // NLA and NLB use electronic scoresheets — no physical upload needed
  const effectiveHasNoScoresheet = hasNoScoresheet || league.name === 'NLA' || league.name === 'NLB'

  // Build linesman convocations based on specified positions
  type LinesmanConvocations = Pick<
    RefereeGame,
    | 'activeRefereeConvocationFirstLinesman'
    | 'activeRefereeConvocationSecondLinesman'
    | 'activeRefereeConvocationThirdLinesman'
    | 'activeRefereeConvocationFourthLinesman'
  >
  const linesmanConvocations: Partial<LinesmanConvocations> = {}
  const linesmanFields: Record<LinesmanPosition, keyof LinesmanConvocations> = {
    1: 'activeRefereeConvocationFirstLinesman',
    2: 'activeRefereeConvocationSecondLinesman',
    3: 'activeRefereeConvocationThirdLinesman',
    4: 'activeRefereeConvocationFourthLinesman',
  }

  const linesmanPositionLabels: Record<LinesmanPosition, 'first' | 'second'> = {
    1: 'first',
    2: 'second',
    3: 'first',
    4: 'second',
  }

  for (const pos of linesmenPositions) {
    const field = linesmanFields[pos]
    linesmanConvocations[field] = createRefereeConvocation(
      idPrefix,
      gameId,
      linesmanPositionLabels[pos],
      HEAD_REFEREE_COUNT + pos
    )
  }

  return {
    __identity: generateDemoUuid(`${idPrefix}-game-${gameId}`),
    isGameInFuture: isGameInFuture ? '1' : '0',
    activeRefereeConvocationFirstHeadReferee: createRefereeConvocation(
      idPrefix,
      gameId,
      'first',
      venueIndex * 2
    ),
    ...(hasSecondHeadReferee && {
      activeRefereeConvocationSecondHeadReferee: createRefereeConvocation(
        idPrefix,
        gameId,
        'second',
        venueIndex * 2 + 1
      ),
    }),
    ...linesmanConvocations,
    game: {
      __identity: generateDemoUuid(`${idPrefix}-g-${gameId}`),
      number: gameNumber,
      startingDateTime: gameDate.toISOString(),
      playingWeekday: getWeekday(gameDate),
      encounter: {
        teamHome: {
          __identity: generateDemoUuid(`team-${idPrefix}-${venueIndex * 2 + 1}`),
          name: venue.teamHome.name,
          identifier: venue.teamHome.identifier,
        },
        teamAway: {
          __identity: generateDemoUuid(`team-${idPrefix}-${venueIndex * 2 + 2}`),
          name: venue.teamAway.name,
          identifier: venue.teamAway.identifier,
        },
      },
      hall: {
        __identity: generateDemoUuid(`hall-${idPrefix}-${venueIndex + 1}`),
        name: venue.hall.name,
        primaryPostalAddress: createAddress({
          id: generateDemoUuid(`addr-${idPrefix}-${venueIndex + 1}`),
          street: venue.hall.street,
          houseNumber: venue.hall.houseNumber,
          postalCode: venue.hall.postalCode,
          city: venue.hall.city,
          latitude: venue.hall.latitude,
          longitude: venue.hall.longitude,
          plusCode: venue.hall.plusCode,
        }),
      },
      group: {
        name: 'Quali',
        managingAssociationShortName: associationCode,
        isTournamentGroup,
        hasNoScoresheet: effectiveHasNoScoresheet,
        phase: {
          name: 'Phase 1',
          league: {
            leagueCategory: league,
            gender,
          },
        },
      },
    },
  }
}
