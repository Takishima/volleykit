import type { Assignment } from '@/api/client'
import type { LeagueCategory, SportsHallReportData } from '@/common/utils/pdf-report-data'

export async function extractReportInfo(assignment: Assignment): Promise<{
  reportData: SportsHallReportData
  leagueCategory: LeagueCategory
} | null> {
  const { extractSportsHallReportData, getLeagueCategoryFromAssignment } =
    await import('@/common/utils/pdf-report-data')

  const reportData = extractSportsHallReportData(assignment)
  const leagueCategory = getLeagueCategoryFromAssignment(assignment)

  if (!reportData || !leagueCategory) return null
  return { reportData, leagueCategory }
}
