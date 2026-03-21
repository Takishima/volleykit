import type { Assignment } from '@/api/client'
import type { LeagueCategory, SportsHallReportData } from '@/shared/utils/pdf-form-filler'

export async function extractReportInfo(assignment: Assignment): Promise<{
  reportData: SportsHallReportData
  leagueCategory: LeagueCategory
} | null> {
  const { extractSportsHallReportData, getLeagueCategoryFromAssignment } =
    await import('@/shared/utils/pdf-form-filler')

  const reportData = extractSportsHallReportData(assignment)
  const leagueCategory = getLeagueCategoryFromAssignment(assignment)

  if (!reportData || !leagueCategory) return null
  return { reportData, leagueCategory }
}
