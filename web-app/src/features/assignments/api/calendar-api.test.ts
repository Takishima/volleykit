import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  fetchCalendarAssignments,
  validateCalendarCode,
  InvalidCalendarCodeError,
  CalendarNotFoundError,
} from './calendar-api'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Sample iCal content for testing
const SAMPLE_ICAL = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Volleyball.ch//Volleymanager//EN
BEGIN:VEVENT
UID:referee-convocation-for-game-100002
SUMMARY:ARB 2 | Team C - Team D (NLA Herren)
DTSTART:20250221T190000
DTEND:20250221T220000
LOCATION:Halle 2, Address 2
GEO:47.5;7.6
END:VEVENT
BEGIN:VEVENT
UID:referee-convocation-for-game-100001
SUMMARY:ARB 1 | Team A - Team B (NLA Damen)
DTSTART:20250220T180000
DTEND:20250220T210000
LOCATION:Halle 1, Address 1
GEO:47.1234;8.5678
END:VEVENT
END:VCALENDAR`

// Sample empty calendar
const EMPTY_ICAL = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Volleyball.ch//Volleymanager//EN
END:VCALENDAR`

// Low-confidence event (missing game ID pattern)
const LOW_CONFIDENCE_ICAL = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:some-random-event-id
SUMMARY:Random Event
DTSTART:20250220T180000
DTEND:20250220T210000
END:VEVENT
END:VCALENDAR`

function createMockResponse(
  content: string,
  options: { ok?: boolean; status?: number; statusText?: string } = {}
) {
  const { ok = true, status = 200, statusText = 'OK' } = options
  return {
    ok,
    status,
    statusText,
    text: () => Promise.resolve(content),
  }
}

describe('fetchCalendarAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('successful fetch', () => {
    it('fetches and parses iCal content successfully', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(SAMPLE_ICAL))

      const assignments = await fetchCalendarAssignments('ABC123')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/iCal/referee/ABC123'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(assignments).toHaveLength(2)
    })

    it('returns assignments sorted by start time (upcoming first)', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(SAMPLE_ICAL))

      const assignments = await fetchCalendarAssignments('ABC123')

      // First event should be 2025-02-20 (earlier)
      expect(assignments[0]!.gameId).toBe('100001')
      expect(assignments[0]!.startTime).toBe('2025-02-20T18:00:00')

      // Second event should be 2025-02-21 (later)
      expect(assignments[1]!.gameId).toBe('100002')
      expect(assignments[1]!.startTime).toBe('2025-02-21T19:00:00')
    })

    it('extracts assignment details correctly', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(SAMPLE_ICAL))

      const assignments = await fetchCalendarAssignments('XYZ789')

      const assignment = assignments.find((a) => a.gameId === '100001')
      expect(assignment).toBeDefined()
      expect(assignment!.homeTeam).toBe('Team A')
      expect(assignment!.awayTeam).toBe('Team B')
      expect(assignment!.league).toBe('NLA Damen')
      expect(assignment!.role).toBe('referee1')
      expect(assignment!.gender).toBe('women')
    })

    it('returns empty array for empty calendar', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(EMPTY_ICAL))

      const assignments = await fetchCalendarAssignments('EMPTY1')

      expect(assignments).toEqual([])
    })

    it('filters out low-confidence results', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(LOW_CONFIDENCE_ICAL))

      const assignments = await fetchCalendarAssignments('LOW123')

      // Low-confidence events should be filtered out
      expect(assignments).toEqual([])
    })
  })

  describe('request configuration', () => {
    it('does not include credentials (public endpoint)', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(SAMPLE_ICAL))

      await fetchCalendarAssignments('ABC123')

      const [, options] = mockFetch.mock.calls[0]!
      expect(options.credentials).toBeUndefined()
    })

    it('passes abort signal to fetch', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(SAMPLE_ICAL))
      const controller = new AbortController()

      await fetchCalendarAssignments('ABC123', controller.signal)

      const [, options] = mockFetch.mock.calls[0]!
      expect(options.signal).toBe(controller.signal)
    })
  })

  describe('error handling', () => {
    it('throws InvalidCalendarCodeError for invalid code format', async () => {
      await expect(fetchCalendarAssignments('ABC')).rejects.toThrow(InvalidCalendarCodeError)
      await expect(fetchCalendarAssignments('ABC12')).rejects.toThrow(InvalidCalendarCodeError)
      await expect(fetchCalendarAssignments('ABC1234')).rejects.toThrow(InvalidCalendarCodeError)
      await expect(fetchCalendarAssignments('ABC-12')).rejects.toThrow(InvalidCalendarCodeError)
      await expect(fetchCalendarAssignments('')).rejects.toThrow(InvalidCalendarCodeError)

      // Fetch should not be called for invalid codes
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('throws CalendarNotFoundError on 404 response', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse('', { ok: false, status: 404, statusText: 'Not Found' })
      )

      await expect(fetchCalendarAssignments('ABC123')).rejects.toThrow(CalendarNotFoundError)
    })

    it('throws Error on other HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse('', { ok: false, status: 500, statusText: 'Internal Server Error' })
      )

      await expect(fetchCalendarAssignments('ABC123')).rejects.toThrow(
        'Failed to fetch calendar: 500 Internal Server Error'
      )
    })

    it('throws Error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(fetchCalendarAssignments('ABC123')).rejects.toThrow('Network error')
    })
  })

  describe('code format validation', () => {
    it('accepts valid 6-character alphanumeric codes', async () => {
      mockFetch.mockResolvedValue(createMockResponse(EMPTY_ICAL))

      // All letters
      await expect(fetchCalendarAssignments('ABCDEF')).resolves.toEqual([])

      // All numbers
      await expect(fetchCalendarAssignments('123456')).resolves.toEqual([])

      // Mixed case
      await expect(fetchCalendarAssignments('AbC123')).resolves.toEqual([])

      // Lowercase
      await expect(fetchCalendarAssignments('abcdef')).resolves.toEqual([])
    })
  })
})

describe('validateCalendarCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('valid codes', () => {
    it('returns true when calendar exists', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(SAMPLE_ICAL))

      const isValid = await validateCalendarCode('ABC123')

      expect(isValid).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/iCal/referee/ABC123'),
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('returns true for empty calendar (valid code with no events)', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(EMPTY_ICAL))

      const isValid = await validateCalendarCode('EMPTY1')

      expect(isValid).toBe(true)
    })

    it('returns true even for malformed calendar content', async () => {
      // If the server returns 200 with garbage, it means the code exists
      mockFetch.mockResolvedValueOnce(createMockResponse('not valid ical content'))

      const isValid = await validateCalendarCode('VALID1')

      expect(isValid).toBe(true)
    })
  })

  describe('invalid codes', () => {
    it('returns false on 404 response', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse('', { ok: false, status: 404, statusText: 'Not Found' })
      )

      const isValid = await validateCalendarCode('NOTFND')

      expect(isValid).toBe(false)
    })

    it('returns false on other error responses', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse('', { ok: false, status: 500, statusText: 'Server Error' })
      )

      const isValid = await validateCalendarCode('ERROR1')

      expect(isValid).toBe(false)
    })
  })

  describe('error handling', () => {
    it('throws InvalidCalendarCodeError for invalid code format', async () => {
      await expect(validateCalendarCode('ABC')).rejects.toThrow(InvalidCalendarCodeError)
      await expect(validateCalendarCode('TOOLONG7')).rejects.toThrow(InvalidCalendarCodeError)
      await expect(validateCalendarCode('ABC-12')).rejects.toThrow(InvalidCalendarCodeError)

      // Fetch should not be called
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('re-throws network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(validateCalendarCode('ABC123')).rejects.toThrow('Network error')
    })

    it('re-throws AbortError for cancelled requests', async () => {
      const abortError = new DOMException('Aborted', 'AbortError')
      mockFetch.mockRejectedValueOnce(abortError)

      await expect(validateCalendarCode('ABC123')).rejects.toThrow('Aborted')
    })

    it('passes abort signal to fetch', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(SAMPLE_ICAL))
      const controller = new AbortController()

      await validateCalendarCode('ABC123', controller.signal)

      const [, options] = mockFetch.mock.calls[0]!
      expect(options.signal).toBe(controller.signal)
    })
  })
})

describe('error classes', () => {
  describe('InvalidCalendarCodeError', () => {
    it('has correct name', () => {
      const error = new InvalidCalendarCodeError('BAD')
      expect(error.name).toBe('InvalidCalendarCodeError')
    })

    it('has descriptive message', () => {
      const error = new InvalidCalendarCodeError('BAD')
      expect(error.message).toContain('BAD')
      expect(error.message).toContain('6 alphanumeric')
    })

    it('is an instance of Error', () => {
      const error = new InvalidCalendarCodeError('BAD')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('CalendarNotFoundError', () => {
    it('has correct name', () => {
      const error = new CalendarNotFoundError('ABC123')
      expect(error.name).toBe('CalendarNotFoundError')
    })

    it('has descriptive message', () => {
      const error = new CalendarNotFoundError('ABC123')
      expect(error.message).toContain('ABC123')
      expect(error.message).toContain('not found')
    })

    it('is an instance of Error', () => {
      const error = new CalendarNotFoundError('ABC123')
      expect(error).toBeInstanceOf(Error)
    })
  })
})
