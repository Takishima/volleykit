import { Button } from '@/common/components/Button'
import { ModalFooter } from '@/common/components/ModalFooter'
import { useTranslation } from '@/common/hooks/useTranslation'
import { DECIMAL_INPUT_PATTERN } from '@/common/utils/distance'

import type { CompensationFormState } from '../hooks/useCompensationForm'

interface CompensationFormProps {
  form: CompensationFormState
  onClose: () => void
}

export function CompensationForm({ form, onClose }: CompensationFormProps) {
  const { t, tInterpolate } = useTranslation()

  return (
    <form onSubmit={form.handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="kilometers"
          className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1"
        >
          {t('assignments.kilometers')}
        </label>
        <div className="relative">
          <input
            id="kilometers"
            type="text"
            inputMode="decimal"
            pattern={DECIMAL_INPUT_PATTERN}
            value={form.kilometers}
            onChange={(e) => form.setKilometers(e.target.value)}
            disabled={!form.isDistanceEditable}
            className={`w-full px-3 py-2 pr-10 border border-border-strong dark:border-border-strong-dark rounded-md bg-surface-card dark:bg-surface-subtle-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 ${!form.isDistanceEditable ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-invalid={form.errors.kilometers ? 'true' : 'false'}
            aria-describedby={
              form.errors.kilometers
                ? 'kilometers-error'
                : !form.isDistanceEditable
                  ? 'kilometers-readonly-hint'
                  : undefined
            }
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-text-muted-dark text-sm pointer-events-none">
            {t('common.distanceUnit')}
          </span>
        </div>
        {form.errors.kilometers && (
          <p id="kilometers-error" className="mt-1 text-sm text-danger-600 dark:text-danger-400">
            {form.errors.kilometers}
          </p>
        )}
        {!form.isDistanceEditable && (
          <p
            id="kilometers-readonly-hint"
            className="mt-1 text-sm text-text-muted dark:text-text-muted-dark"
          >
            {t('compensations.distanceNotEditable')}
          </p>
        )}
      </div>

      {/* Apply to same hall checkbox - only shown for compensation edits with other games at same hall */}
      {!form.isAssignmentEdit &&
        form.isDistanceEditable &&
        form.otherCompensationsAtSameHall.length > 0 &&
        form.hallName && (
          <div className="flex items-start gap-3 p-3 bg-surface-subtle dark:bg-surface-subtle-dark rounded-md">
            <input
              id="apply-to-same-hall"
              type="checkbox"
              checked={form.applyToSameHall}
              onChange={(e) => form.setApplyToSameHall(e.target.checked)}
              aria-describedby="apply-to-same-hall-description"
              className="mt-0.5 h-4 w-4 rounded border-border-strong dark:border-border-strong-dark text-primary-600 focus:ring-primary-500 focus:ring-2"
            />
            <label
              htmlFor="apply-to-same-hall"
              className="text-sm text-text-secondary dark:text-text-secondary-dark cursor-pointer"
            >
              <span className="block font-medium text-text-primary dark:text-text-primary-dark">
                {tInterpolate('compensations.applyToSameHall', { hallName: form.hallName })}
              </span>
              <span
                id="apply-to-same-hall-description"
                className="text-text-muted dark:text-text-muted-dark"
              >
                {tInterpolate('compensations.applyToSameHallCount', {
                  count: String(form.otherCompensationsAtSameHall.length),
                })}
              </span>
            </label>
          </div>
        )}

      <div>
        <label
          htmlFor="reason"
          className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1"
        >
          {t('assignments.reason')}
        </label>
        <textarea
          id="reason"
          value={form.reason}
          onChange={(e) => form.setReason(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-border-strong dark:border-border-strong-dark rounded-md bg-surface-card dark:bg-surface-subtle-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder={t('assignments.reasonPlaceholder')}
        />
      </div>

      <ModalFooter>
        <Button variant="secondary" className="flex-1" onClick={onClose} disabled={form.isSaving}>
          {t('common.close')}
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          type="submit"
          disabled={form.isSaving}
          loading={form.isSaving}
        >
          {t('common.save')}
        </Button>
      </ModalFooter>
    </form>
  )
}
