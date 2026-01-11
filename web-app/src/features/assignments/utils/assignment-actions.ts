import { createElement } from 'react'

import type { Assignment } from '@/api/client'
import type { TranslationKey } from '@/i18n'
import { Wallet, Check, FileText, ArrowLeftRight } from '@/shared/components/icons'
import { type SwipeAction, SWIPE_ACTION_ICON_SIZE } from '@/types/swipe'

// Pre-created icon elements to avoid recreating on each function call
const ICON_WALLET = createElement(Wallet, { size: SWIPE_ACTION_ICON_SIZE })
const ICON_CHECK = createElement(Check, { size: SWIPE_ACTION_ICON_SIZE })
const ICON_FILE_TEXT = createElement(FileText, { size: SWIPE_ACTION_ICON_SIZE })
const ICON_ARROW_LEFT_RIGHT = createElement(ArrowLeftRight, { size: SWIPE_ACTION_ICON_SIZE })

export interface AssignmentActionConfig {
  editCompensation: SwipeAction
  validateGame: SwipeAction
  generateReport: SwipeAction
  addToExchange: SwipeAction
}

export interface AssignmentActionHandlers {
  onEditCompensation: (assignment: Assignment) => void
  onValidateGame: (assignment: Assignment) => void
  onGenerateReport: (assignment: Assignment) => void
  onAddToExchange: (assignment: Assignment) => void
}

type TranslationFn = (key: TranslationKey) => string

export function createAssignmentActions(
  assignment: Assignment,
  handlers: AssignmentActionHandlers,
  t: TranslationFn
): AssignmentActionConfig {
  return {
    editCompensation: {
      id: 'edit-compensation',
      label: t('assignments.editCompensation'),
      shortLabel: t('assignments.editCompensationShort'),
      color: 'bg-primary-500',
      icon: ICON_WALLET,
      onAction: () => handlers.onEditCompensation(assignment),
    },
    validateGame: {
      id: 'validate-game',
      label: t('assignments.validateGame'),
      shortLabel: t('assignments.validateGameShort'),
      color: assignment.refereeGame?.game?.scoresheet?.closedAt ? 'bg-slate-500' : 'bg-primary-500',
      icon: ICON_CHECK,
      onAction: () => handlers.onValidateGame(assignment),
    },
    generateReport: {
      id: 'generate-report',
      label: t('assignments.generateReport'),
      shortLabel: t('assignments.generateReportShort'),
      color: 'bg-slate-500',
      icon: ICON_FILE_TEXT,
      onAction: () => handlers.onGenerateReport(assignment),
    },
    addToExchange: {
      id: 'add-to-exchange',
      label: t('assignments.addToExchange'),
      shortLabel: t('assignments.addToExchangeShort'),
      color: 'bg-primary-500',
      icon: ICON_ARROW_LEFT_RIGHT,
      onAction: () => handlers.onAddToExchange(assignment),
    },
  }
}
