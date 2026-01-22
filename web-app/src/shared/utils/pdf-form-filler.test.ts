import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'

import type { Assignment } from '@/api/client'
import { server } from '@/test/msw/server'

import {
  extractSportsHallReportData,
  getLeagueCategoryFromAssignment,
  mapAppLocaleToPdfLanguage,
  downloadPdf,
  fillSportsHallReportForm,
  type SportsHallReportData,
} from './pdf-form-filler'

// Close MSW server for this file since we use manual fetch mocking in downloadPdf tests
beforeAll(() => {
  server.close()
})

afterAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' })
})

describe('pdf-form-filler', () => {
  describe('extractSportsHallReportData', () => {
    it('extracts data from NLA assignment', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeConvocationStatus: 'active',
        refereePosition: 'head-one',
        refereeGame: {
          __identity: 'referee-game-id',
          game: {
            __identity: 'game-id',
            number: 123456,
            startingDateTime: '2025-12-15T19:30:00.000Z',
            encounter: {
              __identity: 'encounter-id',
              teamHome: { __identity: 'th', name: 'VBC Zürich' },
              teamAway: { __identity: 'ta', name: 'Volley Luzern' },
            },
            hall: {
              __identity: 'hall-id',
              name: 'Sporthalle Hardau',
              primaryPostalAddress: {
                __identity: 'addr-id',
                city: 'Zürich',
              },
            },
            group: {
              __identity: 'group-id',
              phase: {
                __identity: 'phase-id',
                league: {
                  __identity: 'league-id',
                  gender: 'm',
                  leagueCategory: {
                    __identity: 'cat-id',
                    name: 'NLA',
                  },
                },
              },
            },
          },
          activeRefereeConvocationFirstHeadReferee: {
            indoorAssociationReferee: {
              indoorReferee: {
                person: {
                  __identity: 'person1',
                  firstName: 'Max',
                  lastName: 'Mustermann',
                  displayName: 'Max Mustermann',
                },
              },
            },
          },
          activeRefereeConvocationSecondHeadReferee: {
            indoorAssociationReferee: {
              indoorReferee: {
                person: {
                  __identity: 'person2',
                  firstName: 'Anna',
                  lastName: 'Schmidt',
                  displayName: 'Anna Schmidt',
                },
              },
            },
          },
        },
      }

      const result = extractSportsHallReportData(assignment)

      expect(result).toEqual({
        gameNumber: '123456',
        homeTeam: 'VBC Zürich',
        awayTeam: 'Volley Luzern',
        gender: 'm',
        hallName: 'Sporthalle Hardau',
        location: 'Zürich',
        date: '15.12.25',
        firstRefereeName: 'Max Mustermann',
        secondRefereeName: 'Anna Schmidt',
      })
    })

    it('returns null for non-NLA/NLB leagues', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeConvocationStatus: 'active',
        refereePosition: 'head-one',
        refereeGame: {
          __identity: 'referee-game-id',
          game: {
            __identity: 'game-id',
            group: {
              __identity: 'group-id',
              phase: {
                __identity: 'phase-id',
                league: {
                  __identity: 'league-id',
                  leagueCategory: {
                    __identity: 'cat-id',
                    name: '3L',
                  },
                },
              },
            },
          },
        },
      }

      const result = extractSportsHallReportData(assignment)
      expect(result).toBeNull()
    })

    it('returns null when game is missing', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeConvocationStatus: 'active',
        refereePosition: 'head-one',
        refereeGame: {
          __identity: 'referee-game-id',
        },
      }

      const result = extractSportsHallReportData(assignment)
      expect(result).toBeNull()
    })

    it('handles female league', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeConvocationStatus: 'active',
        refereePosition: 'head-two',
        refereeGame: {
          __identity: 'referee-game-id',
          game: {
            __identity: 'game-id',
            number: 789,
            group: {
              __identity: 'group-id',
              phase: {
                __identity: 'phase-id',
                league: {
                  __identity: 'league-id',
                  gender: 'f',
                  leagueCategory: {
                    __identity: 'cat-id',
                    name: 'NLB',
                  },
                },
              },
            },
          },
        },
      }

      const result = extractSportsHallReportData(assignment)
      expect(result?.gender).toBe('f')
    })
  })

  describe('getLeagueCategoryFromAssignment', () => {
    it('returns NLA for NLA league', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeConvocationStatus: 'active',
        refereePosition: 'head-one',
        refereeGame: {
          __identity: 'rg-id',
          game: {
            __identity: 'g-id',
            group: {
              __identity: 'gr-id',
              phase: {
                __identity: 'ph-id',
                league: {
                  __identity: 'l-id',
                  leagueCategory: { __identity: 'lc-id', name: 'NLA' },
                },
              },
            },
          },
        },
      }

      expect(getLeagueCategoryFromAssignment(assignment)).toBe('NLA')
    })

    it('returns NLB for NLB league', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeConvocationStatus: 'active',
        refereePosition: 'head-one',
        refereeGame: {
          __identity: 'rg-id',
          game: {
            __identity: 'g-id',
            group: {
              __identity: 'gr-id',
              phase: {
                __identity: 'ph-id',
                league: {
                  __identity: 'l-id',
                  leagueCategory: { __identity: 'lc-id', name: 'NLB' },
                },
              },
            },
          },
        },
      }

      expect(getLeagueCategoryFromAssignment(assignment)).toBe('NLB')
    })

    it('returns null for other leagues', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeConvocationStatus: 'active',
        refereePosition: 'head-one',
        refereeGame: {
          __identity: 'rg-id',
          game: {
            __identity: 'g-id',
            group: {
              __identity: 'gr-id',
              phase: {
                __identity: 'ph-id',
                league: {
                  __identity: 'l-id',
                  leagueCategory: { __identity: 'lc-id', name: '2L' },
                },
              },
            },
          },
        },
      }

      expect(getLeagueCategoryFromAssignment(assignment)).toBeNull()
    })
  })

  describe('mapAppLocaleToPdfLanguage', () => {
    it('returns de for German locale', () => {
      expect(mapAppLocaleToPdfLanguage('de')).toBe('de')
    })

    it('returns fr for French locale', () => {
      expect(mapAppLocaleToPdfLanguage('fr')).toBe('fr')
    })

    it('returns fr for Italian locale', () => {
      expect(mapAppLocaleToPdfLanguage('it')).toBe('fr')
    })

    it('returns de for English locale (fallback)', () => {
      expect(mapAppLocaleToPdfLanguage('en')).toBe('de')
    })

    it('returns de for unknown locale (fallback)', () => {
      expect(mapAppLocaleToPdfLanguage('es')).toBe('de')
    })
  })

  describe('downloadPdf', () => {
    let mockCreateObjectURL: ReturnType<typeof vi.fn>
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>
    let mockLink: { href: string; download: string; click: ReturnType<typeof vi.fn> }

    beforeEach(() => {
      mockCreateObjectURL = vi.fn(() => 'blob:test-url')
      mockRevokeObjectURL = vi.fn()
      mockLink = { href: '', download: '', click: vi.fn() }

      vi.stubGlobal('URL', {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      })

      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement)
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('creates blob with correct type', () => {
      const pdfBytes = new Uint8Array([1, 2, 3, 4])

      downloadPdf(pdfBytes, 'test.pdf')

      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    })

    it('sets download filename on link', () => {
      const pdfBytes = new Uint8Array([1, 2, 3])

      downloadPdf(pdfBytes, 'my-report.pdf')

      expect(mockLink.download).toBe('my-report.pdf')
    })

    it('triggers click to download', () => {
      const pdfBytes = new Uint8Array([1, 2, 3])

      downloadPdf(pdfBytes, 'test.pdf')

      expect(mockLink.click).toHaveBeenCalled()
    })

    it('cleans up by revoking URL', () => {
      const pdfBytes = new Uint8Array([1, 2, 3])

      downloadPdf(pdfBytes, 'test.pdf')

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url')
    })
  })

  describe('fillSportsHallReportForm', () => {
    const mockReportData: SportsHallReportData = {
      gameNumber: '12345',
      homeTeam: 'VBC Home',
      awayTeam: 'VBC Away',
      gender: 'm',
      hallName: 'Test Hall',
      location: 'Test City',
      date: '15.12.25',
      firstRefereeName: 'First Ref',
      secondRefereeName: 'Second Ref',
    }

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('throws error when PDF template fetch fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: false,
            statusText: 'Not Found',
          })
        )
      )

      await expect(fillSportsHallReportForm(mockReportData, 'NLA', 'de')).rejects.toThrow(
        'Failed to fetch PDF template'
      )
    })

    it('uses correct PDF path for NLA German', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Not Found',
        })
      )
      vi.stubGlobal('fetch', mockFetch)

      await expect(fillSportsHallReportForm(mockReportData, 'NLA', 'de')).rejects.toThrow()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sports-hall-report-nla-de.pdf')
      )
    })

    it('uses correct PDF path for NLB French', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Not Found',
        })
      )
      vi.stubGlobal('fetch', mockFetch)

      await expect(fillSportsHallReportForm(mockReportData, 'NLB', 'fr')).rejects.toThrow()

      // NLB uses path without "nla-" prefix
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('sports-hall-report-fr.pdf'))
    })
  })

  describe('extractSportsHallReportData - edge cases', () => {
    it('handles missing encounter data gracefully', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeConvocationStatus: 'active',
        refereePosition: 'head-one',
        refereeGame: {
          __identity: 'rg-id',
          game: {
            __identity: 'g-id',
            number: 123,
            group: {
              __identity: 'gr-id',
              phase: {
                __identity: 'ph-id',
                league: {
                  __identity: 'l-id',
                  leagueCategory: { __identity: 'lc-id', name: 'NLA' },
                },
              },
            },
          },
        },
      }

      const result = extractSportsHallReportData(assignment)
      expect(result?.homeTeam).toBe('')
      expect(result?.awayTeam).toBe('')
    })

    it('handles missing hall data gracefully', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeConvocationStatus: 'active',
        refereePosition: 'head-one',
        refereeGame: {
          __identity: 'rg-id',
          game: {
            __identity: 'g-id',
            number: 123,
            group: {
              __identity: 'gr-id',
              phase: {
                __identity: 'ph-id',
                league: {
                  __identity: 'l-id',
                  leagueCategory: { __identity: 'lc-id', name: 'NLB' },
                },
              },
            },
          },
        },
      }

      const result = extractSportsHallReportData(assignment)
      expect(result?.hallName).toBe('')
      expect(result?.location).toBe('')
    })

    it('falls back to firstName/lastName when displayName missing', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeConvocationStatus: 'active',
        refereePosition: 'head-one',
        refereeGame: {
          __identity: 'rg-id',
          game: {
            __identity: 'g-id',
            number: 123,
            group: {
              __identity: 'gr-id',
              phase: {
                __identity: 'ph-id',
                league: {
                  __identity: 'l-id',
                  leagueCategory: { __identity: 'lc-id', name: 'NLA' },
                },
              },
            },
          },
          activeRefereeConvocationFirstHeadReferee: {
            indoorAssociationReferee: {
              indoorReferee: {
                person: {
                  __identity: 'p1',
                  firstName: 'John',
                  lastName: 'Doe',
                  // displayName is undefined
                },
              },
            },
          },
        },
      }

      const result = extractSportsHallReportData(assignment)
      expect(result?.firstRefereeName).toBe('John Doe')
    })

    it('returns undefined for referee when person is missing', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeConvocationStatus: 'active',
        refereePosition: 'head-one',
        refereeGame: {
          __identity: 'rg-id',
          game: {
            __identity: 'g-id',
            number: 123,
            group: {
              __identity: 'gr-id',
              phase: {
                __identity: 'ph-id',
                league: {
                  __identity: 'l-id',
                  leagueCategory: { __identity: 'lc-id', name: 'NLA' },
                },
              },
            },
          },
          activeRefereeConvocationFirstHeadReferee: {
            indoorAssociationReferee: {
              indoorReferee: {
                // person is missing
              },
            },
          },
        },
      }

      const result = extractSportsHallReportData(assignment)
      expect(result?.firstRefereeName).toBeUndefined()
    })

    it('handles undefined startingDateTime', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeConvocationStatus: 'active',
        refereePosition: 'head-one',
        refereeGame: {
          __identity: 'rg-id',
          game: {
            __identity: 'g-id',
            number: 123,
            // startingDateTime is undefined
            group: {
              __identity: 'gr-id',
              phase: {
                __identity: 'ph-id',
                league: {
                  __identity: 'l-id',
                  leagueCategory: { __identity: 'lc-id', name: 'NLA' },
                },
              },
            },
          },
        },
      }

      const result = extractSportsHallReportData(assignment)
      expect(result?.date).toBe('')
    })

    it('handles invalid date format', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeConvocationStatus: 'active',
        refereePosition: 'head-one',
        refereeGame: {
          __identity: 'rg-id',
          game: {
            __identity: 'g-id',
            number: 123,
            startingDateTime: 'invalid-date-format',
            group: {
              __identity: 'gr-id',
              phase: {
                __identity: 'ph-id',
                league: {
                  __identity: 'l-id',
                  leagueCategory: { __identity: 'lc-id', name: 'NLA' },
                },
              },
            },
          },
        },
      }

      const result = extractSportsHallReportData(assignment)
      // Should return empty string for invalid date
      expect(result?.date).toBe('')
    })

    it('defaults to male gender when not specified', () => {
      const assignment: Assignment = {
        __identity: 'test-id',
        refereeConvocationStatus: 'active',
        refereePosition: 'head-one',
        refereeGame: {
          __identity: 'rg-id',
          game: {
            __identity: 'g-id',
            number: 123,
            group: {
              __identity: 'gr-id',
              phase: {
                __identity: 'ph-id',
                league: {
                  __identity: 'l-id',
                  // gender is missing
                  leagueCategory: { __identity: 'lc-id', name: 'NLA' },
                },
              },
            },
          },
        },
      }

      const result = extractSportsHallReportData(assignment)
      expect(result?.gender).toBe('m')
    })
  })
})
