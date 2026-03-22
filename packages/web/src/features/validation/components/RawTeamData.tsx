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
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
      <div className="mb-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
          {label}
        </span>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{team.name || '-'}</p>
      </div>

      {/* Players */}
      {team.players.length > 0 && (
        <div className="mb-3">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('validation.ocr.rawData.players')} ({team.players.length})
          </span>
          <div className="mt-1 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400">
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
                    className="text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700"
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
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('validation.ocr.rawData.officials')} ({team.officials.length})
          </span>
          <div className="mt-1 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400">
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
                    className="text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700"
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
