import { memo } from 'react'

import { Card, CardContent, CardHeader } from '@/shared/components/Card'
import { TrainFront, MapPin, Clock, Info, Navigation } from '@/shared/components/icons'
import { ToggleSwitch } from '@/shared/components/ToggleSwitch'
import { useTranslation } from '@/shared/hooks/useTranslation'

import { useTransportSettings } from '../hooks/useTransportSettings'

/** Badge showing the current association code */
function AssociationBadge({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
      {code}
    </span>
  )
}

function TravelSettingsSectionComponent() {
  const { t, tInterpolate } = useTranslation()
  const transport = useTransportSettings()

  // Don't show if no association selected
  if (!transport.associationCode) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrainFront className="w-5 h-5 text-text-muted dark:text-text-muted-dark" />
          <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
            {t('settings.transport.title')}
          </h2>
          <AssociationBadge code={transport.associationCode} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Association context message */}
        <div className="flex items-start gap-2 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary-600 dark:text-primary-400" />
          <p className="text-xs text-primary-700 dark:text-primary-300">
            {t('settings.transport.perAssociationNote')}
          </p>
        </div>

        <p className="text-sm text-text-muted dark:text-text-muted-dark">
          {t('settings.transport.description')}
        </p>

        {/* Status messages */}
        {!transport.hasHomeLocation && (
          <div className="flex items-center gap-2 p-3 bg-surface-subtle dark:bg-surface-subtle-dark rounded-lg">
            <Info className="w-5 h-5 flex-shrink-0 text-text-muted dark:text-text-muted-dark" />
            <span className="text-sm text-text-muted dark:text-text-muted-dark">
              {t('settings.transport.requiresHomeLocation')}
            </span>
          </div>
        )}

        {transport.hasHomeLocation && !transport.isTransportAvailable && (
          <div className="flex items-center gap-2 p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
            <Info className="w-5 h-5 flex-shrink-0 text-warning-600 dark:text-warning-400" />
            <span className="text-sm text-warning-700 dark:text-warning-300">
              {t('settings.transport.apiNotConfigured')}
            </span>
          </div>
        )}

        {/* Enable transport toggle */}
        <div className="py-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                {t('settings.transport.enableCalculations')}
              </span>
            </div>
            <ToggleSwitch
              checked={transport.isTransportEnabled}
              onChange={transport.handleToggleTransport}
              disabled={!transport.canEnableTransport}
              label={t('settings.transport.enableCalculations')}
            />
          </div>
          {!transport.canEnableTransport && (
            <p className="text-xs text-text-muted dark:text-text-muted-dark mt-1">
              {!transport.hasHomeLocation
                ? t('settings.transport.requiresHomeLocation')
                : !transport.isTransportAvailable
                  ? t('settings.transport.apiNotConfigured')
                  : t('settings.transport.disabledHint')}
            </p>
          )}
        </div>

        {/* Settings that require home location */}
        {transport.hasHomeLocation && (
          <>
            {/* Max Distance setting */}
            <div className="pt-2 border-t border-border-subtle dark:border-border-subtle-dark">
              <div className="flex items-center justify-between py-2">
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-text-muted dark:text-text-muted-dark" />
                    <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                      {t('settings.transport.maxDistance')}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted dark:text-text-muted-dark mt-0.5 ml-6">
                    {t('settings.transport.maxDistanceDescription')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={transport.minMaxDistance}
                    max={transport.maxMaxDistance}
                    value={transport.localMaxDistance}
                    onChange={transport.handleMaxDistanceChange}
                    className="w-16 px-2 py-1 text-sm text-right border border-border-default dark:border-border-default-dark rounded-md bg-surface-card dark:bg-surface-card-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label={t('settings.transport.maxDistance')}
                  />
                  <span className="text-sm text-text-muted dark:text-text-muted-dark">
                    {t('common.distanceUnit')}
                  </span>
                </div>
              </div>
            </div>

            {/* Settings that require transport enabled */}
            {transport.isTransportEnabled && (
              <>
                {/* Max Travel Time setting */}
                <div className="pt-2 border-t border-border-subtle dark:border-border-subtle-dark">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <TrainFront className="w-4 h-4 text-text-muted dark:text-text-muted-dark" />
                        <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                          {t('settings.transport.maxTravelTime')}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted dark:text-text-muted-dark mt-0.5 ml-6">
                        {t('settings.transport.maxTravelTimeDescription')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={transport.minMaxTravelTime}
                        max={transport.maxMaxTravelTime}
                        step={15}
                        value={transport.localMaxTravelTime}
                        onChange={transport.handleMaxTravelTimeChange}
                        className="w-16 px-2 py-1 text-sm text-right border border-border-default dark:border-border-default-dark rounded-md bg-surface-card dark:bg-surface-card-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
                        aria-label={t('settings.transport.maxTravelTime')}
                      />
                      <span className="text-sm text-text-muted dark:text-text-muted-dark">
                        {t('common.minutesUnit')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Arrival time setting */}
                <div
                  className="pt-2 border-t border-border-subtle dark:border-border-subtle-dark"
                  data-tour="arrival-time"
                >
                  <div className="flex items-center justify-between py-2">
                    <div className="flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-text-muted dark:text-text-muted-dark" />
                        <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                          {t('settings.transport.arrivalTime')}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted dark:text-text-muted-dark mt-0.5 ml-6">
                        {t('settings.transport.arrivalTimeDescription')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={transport.minArrivalBuffer}
                        max={transport.maxArrivalBuffer}
                        value={transport.localArrivalBuffer}
                        onChange={transport.handleArrivalBufferChange}
                        className="w-16 px-2 py-1 text-sm text-right border border-border-default dark:border-border-default-dark rounded-md bg-surface-card dark:bg-surface-card-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
                        aria-label={t('settings.transport.arrivalTime')}
                      />
                      <span className="text-sm text-text-muted dark:text-text-muted-dark">
                        {t('common.minutesUnit')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SBB destination type setting */}
                <div className="pt-2 border-t border-border-subtle dark:border-border-subtle-dark">
                  <div className="py-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Navigation className="w-4 h-4 text-text-muted dark:text-text-muted-dark" />
                      <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                        {t('settings.transport.sbbDestination')}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted dark:text-text-muted-dark mb-3 ml-6">
                      {t('settings.transport.sbbDestinationDescription')}
                    </div>
                    <div className="flex flex-col gap-2 ml-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sbbDestinationType"
                          value="address"
                          checked={transport.sbbDestinationType === 'address'}
                          onChange={() => transport.handleSbbDestinationTypeChange('address')}
                          className="w-4 h-4 text-primary-600 border-border-default dark:border-border-default-dark focus:ring-primary-500"
                        />
                        <span className="text-sm text-text-primary dark:text-text-primary-dark">
                          {t('settings.transport.sbbDestinationAddress')}
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sbbDestinationType"
                          value="station"
                          checked={transport.sbbDestinationType === 'station'}
                          onChange={() => transport.handleSbbDestinationTypeChange('station')}
                          className="w-4 h-4 text-primary-600 border-border-default dark:border-border-default-dark focus:ring-primary-500"
                        />
                        <span className="text-sm text-text-primary dark:text-text-primary-dark">
                          {t('settings.transport.sbbDestinationStation')}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Cache management */}
                <div className="pt-2 border-t border-border-subtle dark:border-border-subtle-dark">
                  <p className="text-xs text-text-muted dark:text-text-muted-dark mb-2">
                    {t('settings.transport.cacheInfo')}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary dark:text-text-secondary-dark">
                      {tInterpolate('settings.transport.cacheEntries', {
                        count: transport.cacheEntryCount,
                      })}
                    </span>

                    {!transport.showClearConfirm ? (
                      <button
                        type="button"
                        onClick={() => transport.setShowClearConfirm(true)}
                        disabled={transport.cacheEntryCount === 0}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('settings.transport.refreshCache')}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => transport.setShowClearConfirm(false)}
                          className="text-sm text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={transport.handleClearCache}
                          className="text-sm text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300"
                        >
                          {t('common.confirm')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export const TravelSettingsSection = memo(TravelSettingsSectionComponent)
