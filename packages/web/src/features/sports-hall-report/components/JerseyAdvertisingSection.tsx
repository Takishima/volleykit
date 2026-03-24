import { useTranslation } from '@/common/hooks/useTranslation'
import type { JerseyAdvertisingOptions } from '@/common/utils/pdf-form-filler'

import { JerseyAdToggle } from './JerseyAdToggle'

interface JerseyAdvertisingSectionProps {
  jerseyAdvertising: JerseyAdvertisingOptions
  onToggleHome: () => void
  onToggleAway: () => void
  homeTeam: string
  awayTeam: string
  disabled: boolean
}

export function JerseyAdvertisingSection({
  jerseyAdvertising,
  onToggleHome,
  onToggleAway,
  homeTeam,
  awayTeam,
  disabled,
}: JerseyAdvertisingSectionProps) {
  const { tInterpolate } = useTranslation()

  return (
    <div className="space-y-1.5" data-testid="report-jersey-ads">
      <JerseyAdToggle
        label={tInterpolate('pdf.wizard.advertisingTeam', {
          team: homeTeam || '–',
        })}
        checked={jerseyAdvertising.homeTeam}
        onChange={onToggleHome}
        disabled={disabled}
      />
      <JerseyAdToggle
        label={tInterpolate('pdf.wizard.advertisingTeam', {
          team: awayTeam || '–',
        })}
        checked={jerseyAdvertising.awayTeam}
        onChange={onToggleAway}
        disabled={disabled}
      />
    </div>
  )
}
