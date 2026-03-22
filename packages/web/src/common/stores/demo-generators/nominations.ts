/**
 * Demo nomination generators for creating sample nomination lists, players, and scorers.
 */
/* eslint-disable @typescript-eslint/no-magic-numbers -- Demo data uses hardcoded IDs and indices */

import type { NominationList, PossibleNomination, PersonSearchResult } from '@/api/client'
import { generateDemoUuid } from '@/common/utils/demo-uuid'

import { generateAssignments } from './assignments'
import { generateCompensations } from './compensations'
import { generateExchanges } from './exchanges'

import type { DemoAssociationCode } from './shared'

export function generatePossiblePlayers(): PossibleNomination[] {
  const players = [
    { firstName: 'Max', lastName: 'Müller', birthday: '1995-03-15', category: 'SEN' },
    { firstName: 'Anna', lastName: 'Schmidt', birthday: '1998-07-22', category: 'SEN' },
    { firstName: 'Thomas', lastName: 'Weber', birthday: '2002-11-08', category: 'JUN' },
    {
      firstName: 'Laura',
      lastName: 'Keller',
      birthday: '1996-05-30',
      category: 'SEN',
      nominated: true,
    },
    { firstName: 'Marco', lastName: 'Rossi', birthday: '2003-09-12', category: 'JUN' },
    { firstName: 'Sophie', lastName: 'Dubois', birthday: '1994-02-18', category: 'SEN' },
    { firstName: 'Luca', lastName: 'Bernasconi', birthday: '2001-06-25', category: 'JUN' },
    { firstName: 'Nina', lastName: 'Hofmann', birthday: '1997-12-03', category: 'SEN' },
    { firstName: 'David', lastName: 'Frei', birthday: '1999-04-17', category: 'SEN' },
    { firstName: 'Sarah', lastName: 'Brunner', birthday: '2000-08-29', category: 'SEN' },
    { firstName: 'Fabian', lastName: 'Gerber', birthday: '1993-01-11', category: 'SEN' },
    { firstName: 'Julia', lastName: 'Baumann', birthday: '2004-03-05', category: 'JUN' },
    { firstName: 'Patrick', lastName: 'Steiner', birthday: '1992-06-20', category: 'SEN' },
    { firstName: 'Céline', lastName: 'Moser', birthday: '1998-10-14', category: 'SEN' },
    { firstName: 'Yannick', lastName: 'Hofer', birthday: '2001-12-31', category: 'JUN' },
    { firstName: 'Lea', lastName: 'Zimmermann', birthday: '1997-02-08', category: 'SEN' },
    { firstName: 'Nicolas', lastName: 'Lehmann', birthday: '1995-09-23', category: 'SEN' },
    { firstName: 'Vanessa', lastName: 'Bieri', birthday: '2003-07-16', category: 'JUN' },
    { firstName: 'Kevin', lastName: 'Lang', birthday: '1994-11-02', category: 'SEN' },
    { firstName: 'Melanie', lastName: 'Roth', birthday: '1999-05-27', category: 'SEN' },
    { firstName: 'Simon', lastName: 'Koch', birthday: '2002-01-19', category: 'JUN' },
    { firstName: 'Jasmin', lastName: 'Widmer', birthday: '1996-08-12', category: 'SEN' },
    { firstName: 'Florian', lastName: 'Schmid', birthday: '1993-04-06', category: 'SEN' },
    { firstName: 'Noemi', lastName: 'Huber', birthday: '2000-10-25', category: 'SEN' },
    { firstName: 'Sandro', lastName: 'Meyer', birthday: '1998-03-09', category: 'SEN' },
  ]

  return players.map((player, index) => ({
    __identity: generateDemoUuid(`demo-possible-${index + 1}`),
    indoorPlayer: {
      __identity: generateDemoUuid(`demo-player-${index + 1}`),
      person: {
        __identity: generateDemoUuid(`demo-person-p${index + 1}`),
        displayName: `${player.firstName} ${player.lastName}`,
        firstName: player.firstName,
        lastName: player.lastName,
        birthday: player.birthday,
      },
    },
    licenseCategory: player.category,
    isAlreadyNominated: player.nominated ?? false,
  }))
}

export function generateScorers(): PersonSearchResult[] {
  return [
    {
      __identity: 'd1111111-1111-4111-a111-111111111111',
      firstName: 'Hans',
      lastName: 'Müller',
      displayName: 'Hans Müller',
      associationId: 12345,
      birthday: '1985-03-15T00:00:00+00:00',
      gender: 'm',
    },
    {
      __identity: 'd2222222-2222-4222-a222-222222222222',
      firstName: 'Maria',
      lastName: 'Müller',
      displayName: 'Maria Müller',
      associationId: 12346,
      birthday: '1990-07-22T00:00:00+00:00',
      gender: 'f',
    },
    {
      __identity: 'd3333333-3333-4333-a333-333333333333',
      firstName: 'Peter',
      lastName: 'Schmidt',
      displayName: 'Peter Schmidt',
      associationId: 23456,
      birthday: '1978-11-08T00:00:00+00:00',
      gender: 'm',
    },
    {
      __identity: 'd4444444-4444-4444-a444-444444444444',
      firstName: 'Anna',
      lastName: 'Weber',
      displayName: 'Anna Weber',
      associationId: 34567,
      birthday: '1995-01-30T00:00:00+00:00',
      gender: 'f',
    },
    {
      __identity: 'd5555555-5555-4555-a555-555555555555',
      firstName: 'Thomas',
      lastName: 'Brunner',
      displayName: 'Thomas Brunner',
      associationId: 45678,
      birthday: '1982-09-12T00:00:00+00:00',
      gender: 'm',
    },
    {
      __identity: 'd6666666-6666-4666-a666-666666666666',
      firstName: 'Sandra',
      lastName: 'Keller',
      displayName: 'Sandra Keller',
      associationId: 56789,
      birthday: '1988-05-25T00:00:00+00:00',
      gender: 'f',
    },
    {
      __identity: 'd7777777-7777-4777-a777-777777777777',
      firstName: 'Marco',
      lastName: 'Meier',
      displayName: 'Marco Meier',
      associationId: 67890,
      birthday: '1992-12-03T00:00:00+00:00',
      gender: 'm',
    },
    {
      __identity: 'd8888888-8888-4888-a888-888888888888',
      firstName: 'Lisa',
      lastName: 'Fischer',
      displayName: 'Lisa Fischer',
      associationId: 78901,
      birthday: '1985-08-18T00:00:00+00:00',
      gender: 'f',
    },
    {
      __identity: 'd9999999-9999-4999-a999-999999999999',
      firstName: 'Stefan',
      lastName: 'Huber',
      displayName: 'Stefan Huber',
      associationId: 89012,
      birthday: '1975-04-07T00:00:00+00:00',
      gender: 'm',
    },
    {
      __identity: 'daaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
      firstName: 'Nicole',
      lastName: 'Steiner',
      displayName: 'Nicole Steiner',
      associationId: 90123,
      birthday: '1998-02-14T00:00:00+00:00',
      gender: 'f',
    },
  ]
}

export function generateDummyData(associationCode: DemoAssociationCode = 'SV') {
  const now = new Date()

  return {
    assignments: generateAssignments(associationCode, now),
    compensations: generateCompensations(associationCode, now),
    exchanges: generateExchanges(associationCode, now),
    possiblePlayers: generatePossiblePlayers(),
    scorers: generateScorers(),
  }
}

// Nomination list generation
interface PlayerNominationConfig {
  index: number
  shirtNumber: number
  firstName: string
  lastName: string
  licenseCategory: 'SEN' | 'JUN'
  isCaptain?: boolean
  isLibero?: boolean
}

export function createPlayerNomination(
  config: PlayerNominationConfig,
  gameIndex: number,
  teamIndex: number
) {
  const identity = `demo-nom-${gameIndex}-${teamIndex}-${config.index}`
  const displayName = `${config.firstName} ${config.lastName}`
  const birthYear =
    config.licenseCategory === 'JUN' ? 2003 + (config.index % 3) : 1990 + (config.index % 8)
  const birthMonth = ((config.index + teamIndex) % 12) + 1
  const birthDay = ((config.index + gameIndex) % 28) + 1
  const birthday = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
  return {
    __identity: identity,
    shirtNumber: config.shirtNumber,
    isCaptain: config.isCaptain ?? false,
    isLibero: config.isLibero ?? false,
    indoorPlayer: {
      __identity: `demo-player-${gameIndex}-${teamIndex}-${config.index}`,
      person: {
        __identity: `demo-person-${gameIndex}-${teamIndex}-${config.index}`,
        firstName: config.firstName,
        lastName: config.lastName,
        displayName,
        birthday,
      },
    },
    indoorPlayerLicenseCategory: {
      __identity: `lic-${config.licenseCategory.toLowerCase()}`,
      shortName: config.licenseCategory,
    },
  }
}

interface CoachConfig {
  firstName: string
  lastName: string
}

interface NominationListConfig {
  gameId: string
  teamId: string
  teamDisplayName: string
  side: 'home' | 'away'
  players: PlayerNominationConfig[]
  headCoach?: CoachConfig
  firstAssistant?: CoachConfig
  secondAssistant?: CoachConfig
}

export function createCoachPerson(
  coach: CoachConfig,
  gameIndex: number,
  teamIndex: number,
  role: 'head' | 'first' | 'second'
) {
  const displayName = `${coach.firstName} ${coach.lastName}`
  return {
    __identity: `demo-coach-${role}-${gameIndex}-${teamIndex}`,
    firstName: coach.firstName,
    lastName: coach.lastName,
    displayName,
  }
}

export function createNominationList(
  config: NominationListConfig,
  gameIndex: number,
  teamIndex: number,
  closed = false
): NominationList {
  return {
    __identity: `demo-nomlist-${config.side}-${gameIndex}`,
    game: { __identity: config.gameId },
    team: { __identity: config.teamId, displayName: config.teamDisplayName },
    closed,
    isClosedForTeam: closed,
    ...(closed && { closedAt: new Date().toISOString(), closedBy: 'referee' }),
    indoorPlayerNominations: config.players.map((player) =>
      createPlayerNomination(player, gameIndex, teamIndex)
    ),
    ...(config.headCoach && {
      coachPerson: createCoachPerson(config.headCoach, gameIndex, teamIndex, 'head'),
    }),
    ...(config.firstAssistant && {
      firstAssistantCoachPerson: createCoachPerson(
        config.firstAssistant,
        gameIndex,
        teamIndex,
        'first'
      ),
    }),
    ...(config.secondAssistant && {
      secondAssistantCoachPerson: createCoachPerson(
        config.secondAssistant,
        gameIndex,
        teamIndex,
        'second'
      ),
    }),
  }
}

interface NominationListGameConfig {
  gameIndex: number
  /** Whether both nomination lists should be pre-closed (for partial validation demo) */
  closed?: boolean
  home: Omit<NominationListConfig, 'gameId' | 'side'>
  away: Omit<NominationListConfig, 'gameId' | 'side'>
}

export const NOMINATION_LIST_CONFIGS: NominationListGameConfig[] = [
  {
    gameIndex: 1,
    home: {
      teamId: 'team-demo-1',
      teamDisplayName: 'VBC Zürich Lions',
      players: [
        {
          index: 1,
          shirtNumber: 1,
          firstName: 'Marco',
          lastName: 'Meier',
          licenseCategory: 'SEN',
          isCaptain: true,
        },
        {
          index: 2,
          shirtNumber: 7,
          firstName: 'Lukas',
          lastName: 'Schneider',
          licenseCategory: 'SEN',
        },
        {
          index: 3,
          shirtNumber: 12,
          firstName: 'Noah',
          lastName: 'Weber',
          licenseCategory: 'JUN',
          isLibero: true,
        },
        {
          index: 4,
          shirtNumber: 5,
          firstName: 'Felix',
          lastName: 'Keller',
          licenseCategory: 'SEN',
        },
        { index: 5, shirtNumber: 9, firstName: 'Tim', lastName: 'Fischer', licenseCategory: 'SEN' },
        {
          index: 6,
          shirtNumber: 14,
          firstName: 'Jan',
          lastName: 'Brunner',
          licenseCategory: 'SEN',
        },
      ],
      headCoach: { firstName: 'Martin', lastName: 'Schwegler' },
      firstAssistant: { firstName: 'Andreas', lastName: 'Kohler' },
      // No second assistant - to test empty state
    },
    away: {
      teamId: 'team-demo-2',
      teamDisplayName: 'Volley Luzern',
      players: [
        {
          index: 1,
          shirtNumber: 3,
          firstName: 'David',
          lastName: 'Steiner',
          licenseCategory: 'SEN',
          isCaptain: true,
        },
        { index: 2, shirtNumber: 8, firstName: 'Simon', lastName: 'Frei', licenseCategory: 'SEN' },
        {
          index: 3,
          shirtNumber: 11,
          firstName: 'Luca',
          lastName: 'Gerber',
          licenseCategory: 'JUN',
          isLibero: true,
        },
        {
          index: 4,
          shirtNumber: 6,
          firstName: 'Yannick',
          lastName: 'Hofer',
          licenseCategory: 'SEN',
        },
        {
          index: 5,
          shirtNumber: 10,
          firstName: 'Nico',
          lastName: 'Baumann',
          licenseCategory: 'SEN',
        },
      ],
      headCoach: { firstName: 'Patrick', lastName: 'Heuscher' },
      // No assistants - to test adding coaches
    },
  },
  // Game 3: Partially validated - rosters already closed but scoresheet not yet finalized.
  // Demonstrates per-step read-only mode (lock icons on roster steps).
  // Demo user is head-two (second head referee) for this game.
  {
    gameIndex: 3,
    closed: true,
    home: {
      teamId: 'team-demo-3',
      teamDisplayName: 'Volley Näfels',
      players: [
        {
          index: 1,
          shirtNumber: 2,
          firstName: 'Rafael',
          lastName: 'Bosshard',
          licenseCategory: 'SEN',
          isCaptain: true,
        },
        {
          index: 2,
          shirtNumber: 4,
          firstName: 'Damien',
          lastName: 'Carnal',
          licenseCategory: 'SEN',
        },
        {
          index: 3,
          shirtNumber: 8,
          firstName: 'Noel',
          lastName: 'Siegenthaler',
          licenseCategory: 'JUN',
          isLibero: true,
        },
        {
          index: 4,
          shirtNumber: 10,
          firstName: 'Joel',
          lastName: 'Leuthard',
          licenseCategory: 'SEN',
        },
        {
          index: 5,
          shirtNumber: 15,
          firstName: 'Sven',
          lastName: 'Aeberhard',
          licenseCategory: 'SEN',
        },
      ],
      headCoach: { firstName: 'Marco', lastName: 'Bigler' },
      firstAssistant: { firstName: 'Roger', lastName: 'Schneider' },
    },
    away: {
      teamId: 'team-demo-4',
      teamDisplayName: 'Volero Zürich',
      players: [
        {
          index: 1,
          shirtNumber: 1,
          firstName: 'Liam',
          lastName: 'Hess',
          licenseCategory: 'SEN',
          isCaptain: true,
        },
        {
          index: 2,
          shirtNumber: 6,
          firstName: 'Oliver',
          lastName: 'Rinaldi',
          licenseCategory: 'SEN',
        },
        {
          index: 3,
          shirtNumber: 9,
          firstName: 'Julian',
          lastName: 'Staub',
          licenseCategory: 'JUN',
          isLibero: true,
        },
        {
          index: 4,
          shirtNumber: 11,
          firstName: 'Matteo',
          lastName: 'Graf',
          licenseCategory: 'SEN',
        },
        {
          index: 5,
          shirtNumber: 13,
          firstName: 'Robin',
          lastName: 'Thommen',
          licenseCategory: 'SEN',
        },
      ],
      headCoach: { firstName: 'Daniel', lastName: 'Werder' },
    },
  },
]

// Mock nomination lists keyed by game ID, then by team type
export type MockNominationLists = Record<
  string,
  {
    home: NominationList
    away: NominationList
  }
>

export function generateMockNominationLists(): MockNominationLists {
  const result: MockNominationLists = {}

  for (const config of NOMINATION_LIST_CONFIGS) {
    // Must match the game ID pattern from createRefereeGame: `${idPrefix}-g-${gameId}`
    // For assignments, idPrefix is "demo" and gameId is the index string
    const gameUuid = generateDemoUuid(`demo-g-${config.gameIndex}`)

    result[gameUuid] = {
      home: createNominationList(
        { ...config.home, gameId: gameUuid, side: 'home' },
        config.gameIndex,
        1,
        config.closed
      ),
      away: createNominationList(
        { ...config.away, gameId: gameUuid, side: 'away' },
        config.gameIndex,
        2,
        config.closed
      ),
    }
  }

  return result
}
