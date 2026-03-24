import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { Assignment } from '@/api/client'

import { useNonConformantWizard } from './useNonConformantWizard'

vi.mock('@/common/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    tInterpolate: (key: string) => key,
  }),
}))

vi.mock('@/common/utils/logger', () => ({
  createLogger: () => ({ error: vi.fn() }),
}))

vi.mock('./usePdfGeneration', () => ({
  usePdfGeneration: () => ({
    generateNonConformantPreview: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    generateNonConformantFinal: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('../utils/extractReportInfo', () => ({
  extractReportInfo: vi.fn().mockResolvedValue({ leagueCategory: 'NLA' }),
}))

vi.mock('@/common/utils/pdf-field-mappings', () => ({
  getChecklistSections: vi.fn().mockReturnValue([
    {
      id: 'A',
      labelKey: 'section.a',
      subItems: [{ id: 'a1', labelKey: 'sub.a1' }],
    },
    {
      id: 'B',
      labelKey: 'section.b',
      subItems: [
        { id: 'b1', labelKey: 'sub.b1' },
        { id: 'b2', labelKey: 'sub.b2' },
      ],
    },
  ]),
}))

const mockAssignment = { __identity: 'test-assignment' } as Assignment

describe('useNonConformantWizard', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts on the sections step', () => {
    const { result } = renderHook(() => useNonConformantWizard(mockAssignment, 'de', {}, onClose))
    expect(result.current.ncStep).toBe('sections')
  })

  it('canProceed is false when no sections are flagged', () => {
    const { result } = renderHook(() => useNonConformantWizard(mockAssignment, 'de', {}, onClose))
    expect(result.current.canProceed).toBe(false)
  })

  it('canProceed becomes true after flagging a section', () => {
    const { result } = renderHook(() => useNonConformantWizard(mockAssignment, 'de', {}, onClose))
    act(() => {
      result.current.handleToggleSection('A')
    })
    expect(result.current.flaggedSections.has('A')).toBe(true)
    expect(result.current.canProceed).toBe(true)
  })

  it('un-flags a section when toggled twice', () => {
    const { result } = renderHook(() => useNonConformantWizard(mockAssignment, 'de', {}, onClose))
    act(() => {
      result.current.handleToggleSection('A')
    })
    act(() => {
      result.current.handleToggleSection('A')
    })
    expect(result.current.flaggedSections.has('A')).toBe(false)
  })

  it('handleNcBack returns "exit" from the first step', () => {
    const { result } = renderHook(() => useNonConformantWizard(mockAssignment, 'de', {}, onClose))
    const outcome = result.current.handleNcBack()
    expect(outcome).toBe('exit')
  })

  it('reset restores initial state', () => {
    const { result } = renderHook(() => useNonConformantWizard(mockAssignment, 'de', {}, onClose))
    act(() => {
      result.current.handleToggleSection('A')
      result.current.setHomeCoachName('Coach A')
    })
    act(() => {
      result.current.reset()
    })
    expect(result.current.flaggedSections.size).toBe(0)
    expect(result.current.homeCoachName).toBe('')
    expect(result.current.ncStep).toBe('sections')
  })

  it('skips subItems step when all flagged sections are single-sub-item', async () => {
    const { result } = renderHook(() => useNonConformantWizard(mockAssignment, 'de', {}, onClose))
    // Load sections first
    await act(async () => {
      await result.current.loadSections()
    })
    // Flag only section A (single sub-item)
    act(() => {
      result.current.handleToggleSection('A')
    })
    // Advance from sections — should skip to comment (not subItems)
    await act(async () => {
      await result.current.handleNcNext()
    })
    expect(result.current.ncStep).toBe('comment')
  })

  it('shows subItems step when a flagged section has multiple sub-items', async () => {
    const { result } = renderHook(() => useNonConformantWizard(mockAssignment, 'de', {}, onClose))
    await act(async () => {
      await result.current.loadSections()
    })
    // Flag section B (has 2 sub-items)
    act(() => {
      result.current.handleToggleSection('B')
    })
    await act(async () => {
      await result.current.handleNcNext()
    })
    expect(result.current.ncStep).toBe('subItems')
  })
})
