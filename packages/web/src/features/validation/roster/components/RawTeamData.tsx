import { useTranslation } from '@/common/hooks/useTranslation'
import type { ParsedGameSheet } from '@/features/ocr'

interface RawTeamDataProps {
  team: ParsedGameSheet['teamA']
  label: string
}

/**
 * Displays raw OCR data for a single team (players and officials tables).
 */
export function RawTeamData({ team, label }: RawTeamDataProps) {
  const { t } = useTranslation()

  return (
    <div className="bg-surface-page dark:bg-surface-card-dark/50 rounded-lg p-3">
      <div className="mb-2">
        <span className="text-xs font-medium text-text-muted dark:text-text-muted-dark uppercase">
          {label}
        </span>
        <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
          {team.name || '-'}
        </p>
      </div>

      {/* Players */}
      {team.players.length > 0 && (
        <div className="mb-3">
          <span className="text-xs font-medium text-text-muted dark:text-text-muted-dark">
            {t('validation.ocr.rawData.players')} ({team.players.length})
          </span>
          <div className="mt-1 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-text-muted dark:text-text-muted-dark">
                  <th scope="col" className="text-left pr-2 font-medium">
                    {t('validation.ocr.rawData.shirtNumber')}
                  </th>
                  <th scope="col" className="text-left pr-2 font-medium">
                    {t('validation.ocr.rawData.name')}
                  </th>
                  <th scope="col" className="text-left font-medium">
                    {t('validation.ocr.rawData.licenseStatus')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {team.players.map((player) => (
                  <tr
                    key={`${player.shirtNumber}-${player.rawName || player.displayName}`}
                    className="text-text-secondary dark:text-text-secondary-dark border-t border-border-default dark:border-border-default-dark"
                  >
                    <td className="pr-2 py-0.5">{player.shirtNumber ?? '-'}</td>
                    <td className="pr-2 py-0.5 font-mono">
                      {player.rawName || player.displayName}
                    </td>
                    <td className="py-0.5">{player.licenseStatus || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Officials */}
      {team.officials.length > 0 && (
        <div>
          <span className="text-xs font-medium text-text-muted dark:text-text-muted-dark">
            {t('validation.ocr.rawData.officials')} ({team.officials.length})
          </span>
          <div className="mt-1 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-text-muted dark:text-text-muted-dark">
                  <th scope="col" className="text-left pr-2 font-medium">
                    {t('validation.ocr.rawData.role')}
                  </th>
                  <th scope="col" className="text-left font-medium">
                    {t('validation.ocr.rawData.name')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {team.officials.map((official) => (
                  <tr
                    key={`${official.role}-${official.rawName || official.displayName}`}
                    className="text-text-secondary dark:text-text-secondary-dark border-t border-border-default dark:border-border-default-dark"
                  >
                    <td className="pr-2 py-0.5">{official.role}</td>
                    <td className="py-0.5 font-mono">{official.rawName || official.displayName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
