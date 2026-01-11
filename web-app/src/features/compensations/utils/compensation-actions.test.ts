import { isValidElement } from 'react'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import type { Assignment, CompensationRecord } from '@/api/client'

import {
  createCompensationActions,
  downloadCompensationPDF,
  isCompensationEditable,
  isAssignmentCompensationEditable,
} from './compensation-actions'

const mockCompensation: CompensationRecord = {
  __identity: 'test-compensation-1',
  convocationCompensation: {
    gameCompensation: 50,
    travelExpenses: 20,
    paymentDone: false,
  },
  refereeGame: {
    game: {
      startingDateTime: '2025-12-15T18:00:00Z',
      encounter: {
        teamHome: { name: 'Team A' },
        teamAway: { name: 'Team B' },
      },
    },
  },
} as CompensationRecord

describe('createCompensationActions', () => {
  it('should create both action handlers', () => {
    const handlers = {
      onEditCompensation: vi.fn(),
      onGeneratePDF: vi.fn(),
    }

    const actions = createCompensationActions(mockCompensation, handlers)

    expect(actions.editCompensation).toBeDefined()
    expect(actions.generatePDF).toBeDefined()
  })

  it('should call correct handler when action is triggered', () => {
    const handlers = {
      onEditCompensation: vi.fn(),
      onGeneratePDF: vi.fn(),
    }

    const actions = createCompensationActions(mockCompensation, handlers)

    actions.editCompensation.onAction()
    expect(handlers.onEditCompensation).toHaveBeenCalledWith(mockCompensation)

    actions.generatePDF.onAction()
    expect(handlers.onGeneratePDF).toHaveBeenCalledWith(mockCompensation)
  })

  it('should have correct action properties', () => {
    const handlers = {
      onEditCompensation: vi.fn(),
      onGeneratePDF: vi.fn(),
    }

    const actions = createCompensationActions(mockCompensation, handlers)

    expect(actions.editCompensation.id).toBe('edit-compensation')
    expect(actions.editCompensation.label).toBe('Edit Compensation')
    expect(actions.editCompensation.color).toBe('bg-primary-500')
    expect(isValidElement(actions.editCompensation.icon)).toBe(true)

    expect(actions.generatePDF.id).toBe('generate-pdf')
    expect(actions.generatePDF.label).toBe('Generate PDF')
    expect(actions.generatePDF.color).toBe('bg-slate-500')
    expect(isValidElement(actions.generatePDF.icon)).toBe(true)
  })
})

describe('downloadCompensationPDF', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    globalThis.fetch = mockFetch as typeof fetch

    // Mock URL.createObjectURL and URL.revokeObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    globalThis.URL.revokeObjectURL = vi.fn()

    // Mock document methods
    vi.spyOn(document, 'createElement').mockReturnValue({
      click: vi.fn(),
    } as unknown as HTMLElement)
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => ({}) as Node)
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => ({}) as Node)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should successfully download PDF with correct URL encoding', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name === 'Content-Type') return 'application/pdf'
          if (name === 'Content-Disposition') return 'attachment; filename="compensation-123.pdf"'
          return null
        },
      },
      blob: () => Promise.resolve(new Blob(['mock pdf'], { type: 'application/pdf' })),
    })

    await downloadCompensationPDF('test-compensation-1')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('test-compensation-1')),
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      })
    )

    expect(document.createElement).toHaveBeenCalledWith('a')
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('should handle special characters in compensation ID', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name === 'Content-Type') return 'application/pdf'
          return null
        },
      },
      blob: () => Promise.resolve(new Blob(['mock pdf'], { type: 'application/pdf' })),
    })

    const specialId = 'comp/123&test=value'
    await downloadCompensationPDF(specialId)

    const fetchCall = mockFetch.mock.calls[0]?.[0] as string
    expect(fetchCall).toContain(encodeURIComponent(specialId))
    expect(fetchCall).not.toContain('comp/123&test=value') // Should be encoded
  })

  it('should throw error on non-OK response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    })

    await expect(downloadCompensationPDF('test-compensation-1')).rejects.toThrow(
      'Failed to download PDF: Not Found'
    )
  })

  it('should validate PDF content type', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name === 'Content-Type') return 'text/html'
          return null
        },
      },
      blob: () => Promise.resolve(new Blob(['<html></html>'], { type: 'text/html' })),
    })

    await expect(downloadCompensationPDF('test-compensation-1')).rejects.toThrow(
      'Invalid response type: expected PDF but received text/html'
    )
  })

  it('should reject response without Content-Type header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: () => null,
      },
      blob: () => Promise.resolve(new Blob(['mock pdf'], { type: 'application/pdf' })),
    })

    await expect(downloadCompensationPDF('test-compensation-1')).rejects.toThrow(
      'Missing Content-Type header in response'
    )
  })

  it('should extract filename from Content-Disposition header', async () => {
    const createElementSpy = vi.spyOn(document, 'createElement')
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    } as unknown as HTMLAnchorElement
    createElementSpy.mockReturnValue(mockLink)

    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name === 'Content-Type') return 'application/pdf'
          if (name === 'Content-Disposition') return 'attachment; filename="test-report.pdf"'
          return null
        },
      },
      blob: () => Promise.resolve(new Blob(['mock pdf'], { type: 'application/pdf' })),
    })

    await downloadCompensationPDF('test-compensation-1')

    expect(mockLink.download).toBe('test-report.pdf')
  })

  it('should use default filename when Content-Disposition is missing', async () => {
    const createElementSpy = vi.spyOn(document, 'createElement')
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    } as unknown as HTMLAnchorElement
    createElementSpy.mockReturnValue(mockLink)

    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name === 'Content-Type') return 'application/pdf'
          return null
        },
      },
      blob: () => Promise.resolve(new Blob(['mock pdf'], { type: 'application/pdf' })),
    })

    await downloadCompensationPDF('test-compensation-1')

    expect(mockLink.download).toBe('compensation.pdf')
  })

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'))

    await expect(downloadCompensationPDF('test-compensation-1')).rejects.toThrow('Network failure')
  })

  it('should handle non-Error thrown values', async () => {
    mockFetch.mockRejectedValue('string error')

    await expect(downloadCompensationPDF('test-compensation-1')).rejects.toThrow(
      'Unknown error occurred while downloading PDF'
    )
  })

  it('should handle empty compensation ID', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name === 'Content-Type') return 'application/pdf'
          return null
        },
      },
      blob: () => Promise.resolve(new Blob(['mock pdf'], { type: 'application/pdf' })),
    })

    await downloadCompensationPDF('')

    const fetchCall = mockFetch.mock.calls[0]?.[0] as string
    expect(fetchCall).toContain('refereeConvocation=')
  })

  it('should handle whitespace-only compensation ID', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name === 'Content-Type') return 'application/pdf'
          return null
        },
      },
      blob: () => Promise.resolve(new Blob(['mock pdf'], { type: 'application/pdf' })),
    })

    await downloadCompensationPDF('   ')

    const fetchCall = mockFetch.mock.calls[0]?.[0] as string
    expect(fetchCall).toContain(encodeURIComponent('   '))
  })
})

describe('isCompensationEditable', () => {
  it('returns true for unpaid compensation with central payout method', () => {
    const compensation = {
      __identity: 'test-1',
      convocationCompensation: {
        paymentDone: false,
        methodOfDisbursementArbitration: 'central_payout',
        lockPayoutCentralPayoutCompensation: false,
      },
      refereeGame: {},
    } as unknown as CompensationRecord

    expect(isCompensationEditable(compensation)).toBe(true)
  })

  it('returns true for central payout when on-site lock is true but central lock is false (NLB case)', () => {
    // This is the key bug fix test: NLB games may have lockPayoutOnSiteCompensation=true
    // because they don't use on-site payout, but they should still be editable
    // because lockPayoutCentralPayoutCompensation=false
    const compensation = {
      __identity: 'test-1',
      convocationCompensation: {
        paymentDone: false,
        methodOfDisbursementArbitration: 'central_payout',
        lockPayoutOnSiteCompensation: true,
        lockPayoutCentralPayoutCompensation: false,
      },
      refereeGame: {},
    } as unknown as CompensationRecord

    expect(isCompensationEditable(compensation)).toBe(true)
  })

  it('returns false for paid compensation', () => {
    const compensation = {
      __identity: 'test-1',
      convocationCompensation: {
        paymentDone: true,
        methodOfDisbursementArbitration: 'central_payout',
        lockPayoutCentralPayoutCompensation: false,
      },
      refereeGame: {},
    } as unknown as CompensationRecord

    expect(isCompensationEditable(compensation)).toBe(false)
  })

  it('returns false when on-site payout is locked for on-site method (regional association)', () => {
    const compensation = {
      __identity: 'test-1',
      convocationCompensation: {
        paymentDone: false,
        methodOfDisbursementArbitration: 'payout_on_site',
        lockPayoutOnSiteCompensation: true,
      },
      refereeGame: {},
    } as unknown as CompensationRecord

    expect(isCompensationEditable(compensation)).toBe(false)
  })

  it('returns false when central payout is locked for central method', () => {
    const compensation = {
      __identity: 'test-1',
      convocationCompensation: {
        paymentDone: false,
        methodOfDisbursementArbitration: 'central_payout',
        lockPayoutCentralPayoutCompensation: true,
      },
      refereeGame: {},
    } as unknown as CompensationRecord

    expect(isCompensationEditable(compensation)).toBe(false)
  })

  it('returns false when convocationCompensation is undefined', () => {
    const compensation = {
      __identity: 'test-1',
      refereeGame: {},
    } as unknown as CompensationRecord

    expect(isCompensationEditable(compensation)).toBe(false)
  })

  it('returns true when no locks are set and no disbursement method (defaults to editable)', () => {
    const compensation = {
      __identity: 'test-1',
      convocationCompensation: {
        paymentDone: false,
        // No locks set, no disbursement method
      },
      refereeGame: {},
    } as unknown as CompensationRecord

    expect(isCompensationEditable(compensation)).toBe(true)
  })

  it('returns false when any lock is true without disbursement method (backwards compat)', () => {
    const compensation = {
      __identity: 'test-1',
      convocationCompensation: {
        paymentDone: false,
        lockPayoutOnSiteCompensation: true,
        // No disbursement method - checks both locks
      },
      refereeGame: {},
    } as unknown as CompensationRecord

    expect(isCompensationEditable(compensation)).toBe(false)
  })
})

describe('isAssignmentCompensationEditable', () => {
  // Helper to create a refereeGame with league data (not calendar mode)
  const createRefereeGameWithLeague = () => ({
    game: {
      group: {
        phase: {
          league: {
            leagueCategory: { name: 'NLA' },
          },
        },
      },
    },
  })

  describe('calendar mode assignments', () => {
    it('returns false for calendar mode assignments (missing league data)', () => {
      // Calendar mode assignments don't have league data in the nested structure
      const assignment = {
        __identity: 'test-1',
        refereeGame: {
          game: {
            // No group/phase/league - this is a calendar mode assignment
          },
        },
      } as unknown as Assignment

      expect(isAssignmentCompensationEditable(assignment)).toBe(false)
    })

    it('returns false for calendar mode even with empty convocationCompensation', () => {
      const assignment = {
        __identity: 'test-1',
        convocationCompensation: {},
        refereeGame: {
          game: {
            // No league data
          },
        },
      } as unknown as Assignment

      expect(isAssignmentCompensationEditable(assignment)).toBe(false)
    })
  })

  describe('API-sourced assignments (with league data)', () => {
    it('returns true when convocationCompensation is undefined (backwards compatibility)', () => {
      const assignment = {
        __identity: 'test-1',
        refereeGame: createRefereeGameWithLeague(),
      } as unknown as Assignment

      expect(isAssignmentCompensationEditable(assignment)).toBe(true)
    })

    it('returns true for unpaid assignment with central payout method (SV association)', () => {
      const assignment = {
        __identity: 'test-1',
        convocationCompensation: {
          paymentDone: false,
          methodOfDisbursementArbitration: 'central_payout',
          lockPayoutCentralPayoutCompensation: false,
        },
        refereeGame: createRefereeGameWithLeague(),
      } as unknown as Assignment

      expect(isAssignmentCompensationEditable(assignment)).toBe(true)
    })

    it('returns true for central payout when on-site lock is true but central lock is false (NLB case)', () => {
      // This is the key bug fix test for assignments
      const assignment = {
        __identity: 'test-1',
        convocationCompensation: {
          paymentDone: false,
          methodOfDisbursementArbitration: 'central_payout',
          lockPayoutOnSiteCompensation: true,
          lockPayoutCentralPayoutCompensation: false,
        },
        refereeGame: createRefereeGameWithLeague(),
      } as unknown as Assignment

      expect(isAssignmentCompensationEditable(assignment)).toBe(true)
    })

    it('returns false for paid assignment', () => {
      const assignment = {
        __identity: 'test-1',
        convocationCompensation: {
          paymentDone: true,
          methodOfDisbursementArbitration: 'central_payout',
          lockPayoutCentralPayoutCompensation: false,
        },
        refereeGame: createRefereeGameWithLeague(),
      } as unknown as Assignment

      expect(isAssignmentCompensationEditable(assignment)).toBe(false)
    })

    it('returns false when on-site payout is locked for on-site method (regional association)', () => {
      const assignment = {
        __identity: 'test-1',
        convocationCompensation: {
          paymentDone: false,
          methodOfDisbursementArbitration: 'payout_on_site',
          lockPayoutOnSiteCompensation: true,
        },
        refereeGame: createRefereeGameWithLeague(),
      } as unknown as Assignment

      expect(isAssignmentCompensationEditable(assignment)).toBe(false)
    })

    it('returns true when no locks are set (defaults to editable)', () => {
      const assignment = {
        __identity: 'test-1',
        convocationCompensation: {
          paymentDone: false,
          // No locks set
        },
        refereeGame: createRefereeGameWithLeague(),
      } as unknown as Assignment

      expect(isAssignmentCompensationEditable(assignment)).toBe(true)
    })
  })
})
