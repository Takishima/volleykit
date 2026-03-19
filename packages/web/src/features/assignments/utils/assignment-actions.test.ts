import { isValidElement } from 'react'

import { describe, it, expect, vi } from 'vitest'

import type { Assignment } from '@/api/client'

import { createAssignmentActions } from './assignment-actions'

// Mock translation function that returns the key for testing
const mockT = vi.fn((key: string) => key)

const mockAssignment: Assignment = {
  __identity: 'test-assignment-1',
  refereePosition: 'head-one',
  refereeConvocationStatus: 'active',
  refereeGame: {
    game: {
      startingDateTime: '2025-12-15T18:00:00Z',
      encounter: {
        teamHome: { name: 'Team A' },
        teamAway: { name: 'Team B' },
      },
      hall: {
        name: 'Main Arena',
      },
    },
  },
} as Assignment

describe('createAssignmentActions', () => {
  it('should create all four action handlers', () => {
    const handlers = {
      onEditCompensation: vi.fn(),
      onValidateGame: vi.fn(),
      onGenerateReport: vi.fn(),
      onAddToExchange: vi.fn(),
    }

    const actions = createAssignmentActions(mockAssignment, handlers, mockT)

    expect(actions.editCompensation).toBeDefined()
    expect(actions.validateGame).toBeDefined()
    expect(actions.generateReport).toBeDefined()
    expect(actions.addToExchange).toBeDefined()
  })

  it('should call correct handler when action is triggered', () => {
    const handlers = {
      onEditCompensation: vi.fn(),
      onValidateGame: vi.fn(),
      onGenerateReport: vi.fn(),
      onAddToExchange: vi.fn(),
    }

    const actions = createAssignmentActions(mockAssignment, handlers, mockT)

    actions.editCompensation.onAction()
    expect(handlers.onEditCompensation).toHaveBeenCalledWith(mockAssignment)

    actions.validateGame.onAction()
    expect(handlers.onValidateGame).toHaveBeenCalledWith(mockAssignment)

    actions.generateReport.onAction()
    expect(handlers.onGenerateReport).toHaveBeenCalledWith(mockAssignment)

    actions.addToExchange.onAction()
    expect(handlers.onAddToExchange).toHaveBeenCalledWith(mockAssignment)
  })

  it('should have correct action properties', () => {
    const handlers = {
      onEditCompensation: vi.fn(),
      onValidateGame: vi.fn(),
      onGenerateReport: vi.fn(),
      onAddToExchange: vi.fn(),
    }

    const actions = createAssignmentActions(mockAssignment, handlers, mockT)

    expect(actions.editCompensation.id).toBe('edit-compensation')
    expect(actions.editCompensation.label).toBe('assignments.editCompensation')
    expect(actions.editCompensation.color).toBe('bg-primary-500')
    expect(isValidElement(actions.editCompensation.icon)).toBe(true)

    expect(actions.validateGame.id).toBe('validate-game')
    expect(actions.validateGame.label).toBe('assignments.validateGame')
    expect(actions.validateGame.color).toBe('bg-primary-500')
    expect(isValidElement(actions.validateGame.icon)).toBe(true)
  })

  it('should use success color for validate button when game is validated', () => {
    const validatedAssignment: Assignment = {
      ...mockAssignment,
      refereeGame: {
        ...mockAssignment.refereeGame,
        game: {
          ...mockAssignment.refereeGame?.game,
          scoresheet: {
            closedAt: '2025-12-15T20:00:00Z',
          },
        },
      },
    } as Assignment

    const handlers = {
      onEditCompensation: vi.fn(),
      onValidateGame: vi.fn(),
      onGenerateReport: vi.fn(),
      onAddToExchange: vi.fn(),
    }

    const actions = createAssignmentActions(validatedAssignment, handlers, mockT)

    expect(actions.validateGame.color).toBe('bg-slate-500')
  })
})
