import { createElement } from 'react'

import type { CompensationRecord } from '@/api/client'
import { Wallet, FileText, Smartphone } from '@/common/components/icons'
import { type SwipeAction, SWIPE_ACTION_ICON_SIZE } from '@/types/swipe'

import {
  type ConvocationCompensationWithLockFlags,
  isCompensationLocked,
} from './compensation-helpers'

// Re-export for cross-feature access
export { isAssignmentCompensationEditable } from './compensation-helpers'

/**
 * Checks if a compensation record can be edited.
 *
 * Editability rules (based on disbursement method):
 * - Non-editable: API explicitly denies update permission (_permissions.properties.convocationCompensation.update === false)
 * - Non-editable: paymentDone=true (already paid)
 * - Non-editable: relevant lock is true based on methodOfDisbursementArbitration
 *   - payout_on_site: check lockPayoutOnSiteCompensation
 *   - central_payout: check lockPayoutCentralPayoutCompensation
 * - Editable: not paid AND relevant lock is false
 */
export function isCompensationEditable(compensation: CompensationRecord): boolean {
  // Check API-level permissions first - server knows best
  if (compensation._permissions?.properties?.convocationCompensation?.update === false) {
    return false
  }

  const cc = compensation.convocationCompensation as
    | ConvocationCompensationWithLockFlags
    | undefined
  if (!cc) return false

  // Already paid - not editable
  if (cc.paymentDone) return false

  // Check the appropriate lock based on disbursement method
  if (isCompensationLocked(cc)) return false

  return true
}

// Pre-created icon elements to avoid recreating on each function call
const ICON_WALLET = createElement(Wallet, { size: SWIPE_ACTION_ICON_SIZE })
const ICON_FILE_TEXT = createElement(FileText, { size: SWIPE_ACTION_ICON_SIZE })
const ICON_SMARTPHONE = createElement(Smartphone, { size: SWIPE_ACTION_ICON_SIZE })

export interface CompensationActionConfig {
  editCompensation: SwipeAction
  generatePDF: SwipeAction
  twintPayment: SwipeAction
}

export interface CompensationActionHandlers {
  onEditCompensation: (compensation: CompensationRecord) => void
  onGeneratePDF: (compensation: CompensationRecord) => void
  onTwintPayment: () => void
}

export function createCompensationActions(
  compensation: CompensationRecord,
  handlers: CompensationActionHandlers
): CompensationActionConfig {
  return {
    editCompensation: {
      id: 'edit-compensation',
      label: 'Edit Compensation',
      shortLabel: 'Edit',
      color: 'bg-primary-500',
      icon: ICON_WALLET,
      onAction: () => handlers.onEditCompensation(compensation),
    },
    generatePDF: {
      id: 'generate-pdf',
      label: 'Generate PDF',
      shortLabel: 'PDF',
      color: 'bg-slate-500',
      icon: ICON_FILE_TEXT,
      onAction: () => handlers.onGeneratePDF(compensation),
    },
    twintPayment: {
      id: 'twint-payment',
      label: 'Twint',
      shortLabel: 'Twint',
      color: 'bg-pink-500',
      icon: ICON_SMARTPHONE,
      onAction: () => handlers.onTwintPayment(),
    },
  }
}

// Re-export PDF download from dedicated module for backwards compatibility
export { downloadCompensationPDF } from './compensation-pdf'
