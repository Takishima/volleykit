/**
 * Demo compensation generators for creating sample compensation records.
 */

import { subDays } from 'date-fns'

import type { CompensationRecord } from '@/api/client'
import { generateDemoUuid } from '@/common/utils/demo-uuid'
import {
  createCompensationData,
  calculateTravelExpenses,
  SAMPLE_DISTANCES,
  type RefereePosition,
} from '@/features/compensations/utils/demo-compensation'

import {
  type DemoAssociationCode,
  type LinesmanPosition,
  DEMO_GAME_NUMBERS,
  toDateString,
  getLeaguesForAssociation,
  addOfficialsToConfig,
  createRefereeGame,
} from './shared'

interface CompensationConfig {
  index: number
  position: RefereePosition
  daysAgo: number
  venueIndex: number
  leagueIndex: number
  gender: 'm' | 'f'
  distance: keyof typeof SAMPLE_DISTANCES
  paymentDone: boolean
  paymentDaysAgo?: number
  transportationMode?: 'car' | 'train'
  correctionReason?: string | null
  /** Override the default lock behavior for this specific compensation */
  lockPayoutOnSiteCompensation?: boolean
  /** Whether to include second head referee */
  hasSecondHeadReferee?: boolean
  /** Which linesman positions are assigned for this game (1-4) */
  linesmenPositions?: LinesmanPosition[]
}

export function createCompensationRecord(
  config: CompensationConfig,
  associationCode: DemoAssociationCode,
  now: Date,
  isSV: boolean
): CompensationRecord {
  // Regional associations use on-site payout, which locks compensation editing
  // unless explicitly overridden in config
  const useOnSitePayout = !isSV
  const lockPayoutOnSiteCompensation = config.lockPayoutOnSiteCompensation ?? useOnSitePayout

  return {
    __identity: generateDemoUuid(`demo-comp-${config.index}`),
    refereeConvocationStatus: 'active',
    refereePosition: config.position,
    compensationDate: subDays(now, config.daysAgo).toISOString(),
    refereeGame: createRefereeGame({
      gameId: String(config.index),
      gameNumber: DEMO_GAME_NUMBERS.COMPENSATIONS[config.index - 1]!,
      gameDate: subDays(now, config.daysAgo),
      venueIndex: config.venueIndex,
      leagueIndex: config.leagueIndex,
      gender: config.gender,
      isGameInFuture: false,
      associationCode,
      idPrefix: 'comp',
      hasSecondHeadReferee: config.hasSecondHeadReferee,
      linesmenPositions: config.linesmenPositions,
    }),
    convocationCompensation: {
      __identity: generateDemoUuid(`demo-cc-${config.index}`),
      ...createCompensationData({
        position: config.position,
        distanceInMetres: SAMPLE_DISTANCES[config.distance],
        isSV,
        paymentDone: config.paymentDone,
        ...(config.paymentDaysAgo !== undefined && {
          paymentValueDate: toDateString(subDays(now, config.paymentDaysAgo)),
        }),
        transportationMode: config.transportationMode,
        correctionReason: config.correctionReason,
        lockPayoutOnSiteCompensation,
        methodOfDisbursement: useOnSitePayout ? 'payout_on_site' : 'central_payout',
      }),
    },
  }
}

export function generateCompensations(
  associationCode: DemoAssociationCode,
  now: Date
): CompensationRecord[] {
  const isSV = associationCode === 'SV'
  const leagues = getLeaguesForAssociation(associationCode)

  const configs: CompensationConfig[] = [
    // NLA/1L men - head referee
    {
      index: 1,
      position: 'head-one',
      daysAgo: 7,
      venueIndex: 0,
      leagueIndex: 0,
      gender: 'm',
      distance: 'MEDIUM_LONG',
      paymentDone: true,
      paymentDaysAgo: 2,
      correctionReason: 'Ich wohne in Oberengstringen',
    },
    // NLA for SV (linesman), 1L for regional
    {
      index: 2,
      position: 'linesman-one',
      daysAgo: 14,
      venueIndex: 1,
      leagueIndex: 0,
      gender: 'm',
      distance: 'MEDIUM',
      paymentDone: false,
    },
    // NLA/1L women - head referee
    {
      index: 3,
      position: 'head-two',
      daysAgo: 21,
      venueIndex: 2,
      leagueIndex: 0,
      gender: 'f',
      distance: 'LONG',
      paymentDone: true,
      paymentDaysAgo: 14,
      correctionReason: 'Umweg wegen Baustelle',
    },
    // NLB for SV, 3L for regional - women (3L women have only 1st ref)
    {
      index: 4,
      position: 'head-one',
      daysAgo: 5,
      venueIndex: 3,
      leagueIndex: associationCode === 'SV' ? 1 : 2,
      gender: 'f',
      distance: 'VERY_LONG',
      paymentDone: false,
    },
    // NLA for SV (linesman), 3L for regional
    {
      index: 5,
      position: 'linesman-two',
      daysAgo: 28,
      venueIndex: 4,
      leagueIndex: associationCode === 'SV' ? 0 : 2,
      gender: 'm',
      distance: 'SHORT',
      paymentDone: true,
      paymentDaysAgo: 21,
      transportationMode: 'train',
    },
  ]

  return configs.map((config) =>
    createCompensationRecord(addOfficialsToConfig(config, leagues), associationCode, now, isSV)
  )
}

/**
 * Updates a compensation record with new distance/reason values.
 * Recalculates travel expenses when distance changes.
 */
export function updateCompensationRecord(
  comp: CompensationRecord,
  compensationId: string,
  data: { distanceInMetres?: number; correctionReason?: string }
): CompensationRecord {
  // Match by convocationCompensation.__identity, not comp.__identity
  if (comp.convocationCompensation?.__identity !== compensationId) return comp

  const demoComp = comp.convocationCompensation as {
    __identity?: string
    distanceInMetres?: number
    distanceFormatted?: string
    correctionReason?: string | null
  }
  const newDistance = data.distanceInMetres ?? demoComp.distanceInMetres

  return {
    ...comp,
    convocationCompensation: {
      ...comp.convocationCompensation,
      distanceInMetres: newDistance,
      travelExpenses:
        newDistance !== undefined
          ? calculateTravelExpenses(newDistance)
          : comp.convocationCompensation.travelExpenses,
      ...(data.correctionReason !== undefined && {
        correctionReason: data.correctionReason,
      }),
    },
  }
}
