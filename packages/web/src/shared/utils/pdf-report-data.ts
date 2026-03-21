import { format } from 'date-fns'

import type { Assignment } from '@/api/client'

import { logger } from './logger'

export type LeagueCategory = 'NLA' | 'NLB'
export type Language = 'de' | 'fr'
export type Gender = 'm' | 'f'

export function mapAppLocaleToPdfLanguage(appLocale: string): Language {
  if (appLocale === 'fr' || appLocale === 'it') {
    return 'fr'
  }
  return 'de'
}

export interface SportsHallReportData {
  gameNumber: string
  homeTeam: string
  awayTeam: string
  gender: Gender
  hallName: string
  location: string
  date: string
  startingDateTime?: string
  firstRefereeName?: string
  secondRefereeName?: string
}

function formatDateForReport(isoString: string | undefined): string {
  if (!isoString) return ''
  try {
    return format(new Date(isoString), 'dd.MM.yy')
  } catch {
    // Invalid date format - return empty string so form field shows blank
    logger.warn('Failed to parse date for PDF report:', isoString)
    return ''
  }
}

function getRefereeName(
  convocation:
    | {
        indoorAssociationReferee?: {
          indoorReferee?: {
            person?: {
              firstName?: string
              lastName?: string
              displayName?: string
            }
          }
        }
      }
    | null
    | undefined
): string | undefined {
  const person = convocation?.indoorAssociationReferee?.indoorReferee?.person
  if (!person) return undefined
  return (
    person.displayName || `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || undefined
  )
}

export function extractSportsHallReportData(assignment: Assignment): SportsHallReportData | null {
  const game = assignment.refereeGame?.game
  if (!game) return null

  const leagueCategoryName = game.group?.phase?.league?.leagueCategory?.name
  if (leagueCategoryName !== 'NLA' && leagueCategoryName !== 'NLB') {
    return null
  }

  const refereeGame = assignment.refereeGame
  const firstReferee = getRefereeName(refereeGame?.activeRefereeConvocationFirstHeadReferee)
  const secondReferee = getRefereeName(refereeGame?.activeRefereeConvocationSecondHeadReferee)

  const reportData: SportsHallReportData = {
    gameNumber: game.number?.toString() ?? '',
    homeTeam: game.encounter?.teamHome?.name ?? '',
    awayTeam: game.encounter?.teamAway?.name ?? '',
    gender: (game.group?.phase?.league?.gender ?? 'm') as Gender,
    hallName: game.hall?.name ?? '',
    location: game.hall?.primaryPostalAddress?.city ?? '',
    date: formatDateForReport(game.startingDateTime),
    startingDateTime: game.startingDateTime,
    firstRefereeName: firstReferee,
    secondRefereeName: secondReferee,
  }

  // Debug logging for troubleshooting PDF generation
  logger.debug('[pdf-form-filler] Extracted report data:', reportData)

  return reportData
}

export function getLeagueCategoryFromAssignment(assignment: Assignment): LeagueCategory | null {
  const name = assignment.refereeGame?.game?.group?.phase?.league?.leagueCategory?.name
  if (name === 'NLA' || name === 'NLB') {
    return name
  }
  return null
}

const REPORT_NAME: Record<Language, string> = {
  de: 'hallenrapport',
  fr: 'rapport_salle',
}

export function buildReportFilename(
  leagueCategory: LeagueCategory,
  language: Language,
  startingDateTime?: string,
  gameNumber?: string
): string {
  const league = leagueCategory.toLowerCase()
  const reportName = REPORT_NAME[language]
  let datePart = 'unknown'
  if (startingDateTime) {
    try {
      datePart = format(new Date(startingDateTime), 'yyyyMMdd')
    } catch {
      logger.warn('Failed to parse date for report filename:', startingDateTime)
    }
  }
  const suffix = gameNumber ? `_${gameNumber}` : ''
  return `${league}_${reportName}_${datePart}${suffix}.pdf`
}
