/**
 * Shared compensation utility functions.
 *
 * Promoted from features/compensations/ to shared/ because
 * isAssignmentCompensationEditable is used by the assignments feature.
 */

import { isFromCalendarMode } from '@volleykit/shared/utils'

import type { Assignment } from '@/api/client'

/**
 * Disbursement method for compensation payments.
 */
export type DisbursementMethod = 'payout_on_site' | 'central_payout'

/**
 * Extended compensation type that includes lock flags and disbursement method.
 */
export interface ConvocationCompensationWithLockFlags {
  paymentDone?: boolean
  lockPayoutOnSiteCompensation?: boolean
  lockPayoutCentralPayoutCompensation?: boolean
  methodOfDisbursementArbitration?: DisbursementMethod
}

/**
 * Checks if compensation is locked based on the disbursement method.
 */
export function isCompensationLocked(cc: ConvocationCompensationWithLockFlags): boolean {
  const method = cc.methodOfDisbursementArbitration

  if (method === 'payout_on_site') {
    return cc.lockPayoutOnSiteCompensation === true
  }

  if (method === 'central_payout') {
    return cc.lockPayoutCentralPayoutCompensation === true
  }

  return cc.lockPayoutOnSiteCompensation === true || cc.lockPayoutCentralPayoutCompensation === true
}

/**
 * Checks if an assignment's compensation can be edited.
 *
 * Editability rules (same as isCompensationEditable):
 * - Non-editable: Calendar mode assignments (missing compensation data entirely)
 * - Non-editable: API explicitly denies update permission
 * - Non-editable: paymentDone=true (already paid)
 * - Non-editable: relevant lock is true based on methodOfDisbursementArbitration
 * - Editable: convocationCompensation not present but NOT calendar mode (defaults to editable)
 * - Editable: not paid AND relevant lock is false
 */
export function isAssignmentCompensationEditable(assignment: Assignment): boolean {
  if (isFromCalendarMode(assignment)) {
    return false
  }

  if (assignment._permissions?.properties?.convocationCompensation?.update === false) {
    return false
  }

  const cc = assignment.convocationCompensation as ConvocationCompensationWithLockFlags | undefined
  if (!cc) return true

  if (cc.paymentDone) return false

  if (isCompensationLocked(cc)) return false

  return true
}
