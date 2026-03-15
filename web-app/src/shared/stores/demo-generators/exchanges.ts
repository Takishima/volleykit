/**
 * Demo exchange generators for creating sample game exchange data.
 */
/* eslint-disable @typescript-eslint/no-magic-numbers -- Demo data uses hardcoded IDs and indices */

import { addDays, subDays } from 'date-fns'

import type { GameExchange } from '@/api/client'
import { generateDemoUuid } from '@/shared/utils/demo-uuid'

import {
  type DemoAssociationCode,
  getLeaguesForAssociation,
  getRequiredOfficials,
  createRefereeGame,
} from './shared'

export function generateExchanges(associationCode: DemoAssociationCode, now: Date): GameExchange[] {
  const isSV = associationCode === 'SV'
  const leagues = getLeaguesForAssociation(associationCode)

  // Helper to get officials for a game
  const getOfficials = (leagueIndex: number, gender: 'm' | 'f') => {
    const league = leagues[leagueIndex % leagues.length]!
    return getRequiredOfficials(league.name, gender)
  }

  // Exchange 1: NLA/1L men - head referee
  const ex1Officials = getOfficials(0, 'm')
  // Exchange 2: NLA for SV (linesman position), 1L for regional
  const ex2Officials = getOfficials(0, 'm')
  // Exchange 3: NLA/1L women - head referee
  const ex3Officials = getOfficials(0, 'f')
  // Exchange 4: NLB for SV, 3L for regional - women (3L women have only 1st ref)
  const ex4LeagueIndex = isSV ? 1 : 2
  const ex4Officials = getOfficials(ex4LeagueIndex, 'f')
  // Exchange 5: NLA for SV (linesman position), 3L for regional
  const ex5LeagueIndex = isSV ? 0 : 2
  const ex5Officials = getOfficials(ex5LeagueIndex, 'm')

  return [
    {
      __identity: generateDemoUuid('demo-exchange-1'),
      status: 'open',
      submittedAt: subDays(now, 2).toISOString(),
      submittingType: 'referee',
      refereePosition: 'head-one',
      requiredRefereeLevel: 'N3',
      requiredRefereeLevelGradationValue: '1',
      submittedByPerson: {
        __identity: generateDemoUuid('demo-person-1'),
        firstName: 'Max',
        lastName: 'Müller',
        displayName: 'Max Müller',
      },
      refereeGame: {
        ...createRefereeGame({
          gameId: '1',
          gameNumber: 382600,
          gameDate: addDays(now, 4),
          venueIndex: 0,
          leagueIndex: 0,
          gender: 'm',
          isGameInFuture: true,
          associationCode,
          idPrefix: 'ex',
          hasSecondHeadReferee: ex1Officials.hasSecondHeadReferee,
          linesmenPositions: ex1Officials.linesmenPositions,
        }),
        activeFirstHeadRefereeName: 'Max Müller',
        activeSecondHeadRefereeName: 'Lisa Weber',
      },
    },
    {
      __identity: generateDemoUuid('demo-exchange-2'),
      status: 'open',
      submittedAt: subDays(now, 1).toISOString(),
      submittingType: 'referee',
      refereePosition: 'linesman-one',
      requiredRefereeLevel: 'N2',
      requiredRefereeLevelGradationValue: '2',
      submittedByPerson: {
        __identity: generateDemoUuid('demo-person-2'),
        firstName: 'Anna',
        lastName: 'Schmidt',
        displayName: 'Anna Schmidt',
      },
      refereeGame: {
        ...createRefereeGame({
          gameId: '2',
          gameNumber: 382601,
          gameDate: addDays(now, 6),
          venueIndex: 1,
          leagueIndex: 0,
          gender: 'm',
          isGameInFuture: true,
          associationCode,
          idPrefix: 'ex',
          hasSecondHeadReferee: ex2Officials.hasSecondHeadReferee,
          linesmenPositions: ex2Officials.linesmenPositions,
        }),
        activeFirstHeadRefereeName: 'Thomas Meier',
        activeSecondHeadRefereeName: 'Sandra Keller',
        activeFirstLinesmanRefereeName: 'Anna Schmidt',
      },
    },
    {
      __identity: generateDemoUuid('demo-exchange-3'),
      status: 'applied',
      submittedAt: subDays(now, 5).toISOString(),
      submittingType: 'referee',
      refereePosition: 'head-two',
      requiredRefereeLevel: 'N2',
      requiredRefereeLevelGradationValue: '1',
      submittedByPerson: {
        __identity: generateDemoUuid('demo-person-3'),
        firstName: 'Peter',
        lastName: 'Weber',
        displayName: 'Peter Weber',
      },
      appliedBy: {
        indoorReferee: {
          person: {
            __identity: generateDemoUuid('demo-me'),
            firstName: 'Demo',
            lastName: 'User',
            displayName: 'Demo User',
          },
        },
      },
      appliedAt: subDays(now, 3).toISOString(),
      refereeGame: {
        ...createRefereeGame({
          gameId: '3',
          gameNumber: 382602,
          gameDate: addDays(now, 8),
          venueIndex: 2,
          leagueIndex: 0,
          gender: 'f',
          isGameInFuture: true,
          associationCode,
          idPrefix: 'ex',
          hasSecondHeadReferee: ex3Officials.hasSecondHeadReferee,
          linesmenPositions: ex3Officials.linesmenPositions,
        }),
        activeFirstHeadRefereeName: 'Laura Brunner',
        activeSecondHeadRefereeName: 'Peter Weber',
      },
    },
    {
      __identity: generateDemoUuid('demo-exchange-4'),
      status: 'open',
      submittedAt: subDays(now, 3).toISOString(),
      submittingType: 'admin',
      refereePosition: 'head-one',
      requiredRefereeLevel: isSV ? 'N1' : 'N2',
      requiredRefereeLevelGradationValue: '1',
      submittedByPerson: {
        __identity: generateDemoUuid('demo-person-4'),
        firstName: 'Sara',
        lastName: 'Keller',
        displayName: 'Sara Keller',
      },
      refereeGame: {
        ...createRefereeGame({
          gameId: '4',
          gameNumber: 382603,
          gameDate: addDays(now, 10),
          venueIndex: 3,
          leagueIndex: ex4LeagueIndex,
          gender: 'f',
          isGameInFuture: true,
          associationCode,
          idPrefix: 'ex',
          hasSecondHeadReferee: ex4Officials.hasSecondHeadReferee,
          linesmenPositions: ex4Officials.linesmenPositions,
        }),
        activeFirstHeadRefereeName: '',
        // For 3L women (regional), there's no second head referee
        ...(ex4Officials.hasSecondHeadReferee && {
          activeSecondHeadRefereeName: 'Julia Hofer',
        }),
      },
    },
    {
      __identity: generateDemoUuid('demo-exchange-5'),
      status: 'closed',
      submittedAt: subDays(now, 10).toISOString(),
      submittingType: 'referee',
      refereePosition: 'linesman-two',
      requiredRefereeLevel: 'N3',
      requiredRefereeLevelGradationValue: '3',
      submittedByPerson: {
        __identity: generateDemoUuid('demo-person-5'),
        firstName: 'Thomas',
        lastName: 'Huber',
        displayName: 'Thomas Huber',
      },
      refereeGame: {
        ...createRefereeGame({
          gameId: '5',
          gameNumber: 382604,
          gameDate: subDays(now, 2),
          venueIndex: 4,
          leagueIndex: ex5LeagueIndex,
          gender: 'm',
          isGameInFuture: false,
          associationCode,
          idPrefix: 'ex',
          hasSecondHeadReferee: ex5Officials.hasSecondHeadReferee,
          linesmenPositions: ex5Officials.linesmenPositions,
        }),
        activeFirstHeadRefereeName: 'Michael Fischer',
        activeSecondHeadRefereeName: 'Nina Baumann',
        activeSecondLinesmanRefereeName: 'Demo User',
      },
    },
  ]
}
