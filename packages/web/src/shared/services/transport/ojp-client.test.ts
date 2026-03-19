/**
 * Tests for OJP client functions.
 */

import { describe, it, expect } from 'vitest'

import {
  selectBestTrip,
  extractDestinationStation,
  extractOriginStation,
  extractFinalWalkingMinutes,
  calculateActualArrivalTime,
  type OjpTrip,
} from './ojp-client'

describe('selectBestTrip', () => {
  // Helper to create trip objects
  const createTrip = (
    endTime: string,
    transfers: number,
    duration = 'PT1H',
    startTime = '2025-01-15T12:00:00Z'
  ): OjpTrip => ({
    duration,
    startTime,
    endTime,
    transfers,
    leg: [],
  })

  describe('without target arrival time', () => {
    it('returns the first trip (earliest departure)', () => {
      const trips: OjpTrip[] = [
        createTrip('2025-01-15T13:00:00Z', 1),
        createTrip('2025-01-15T13:30:00Z', 0),
        createTrip('2025-01-15T14:00:00Z', 2),
      ]

      const result = selectBestTrip(trips)

      expect(result).toBe(trips[0])
    })
  })

  describe('with target arrival time', () => {
    const targetArrivalTime = new Date('2025-01-15T14:00:00Z')

    it('filters out trips that arrive after target', () => {
      const trips: OjpTrip[] = [
        createTrip('2025-01-15T14:30:00Z', 0), // Too late
        createTrip('2025-01-15T13:45:00Z', 1), // On time
        createTrip('2025-01-15T15:00:00Z', 0), // Too late
      ]

      const result = selectBestTrip(trips, targetArrivalTime)

      expect(result.endTime).toBe('2025-01-15T13:45:00Z')
    })

    it('prefers fewer transfers over arrival time proximity', () => {
      const trips: OjpTrip[] = [
        createTrip('2025-01-15T13:55:00Z', 2), // On time, 2 transfers, closest to target
        createTrip('2025-01-15T13:30:00Z', 0), // On time, 0 transfers, further from target
        createTrip('2025-01-15T13:45:00Z', 1), // On time, 1 transfer
      ]

      const result = selectBestTrip(trips, targetArrivalTime)

      // Should prefer 0 transfers even though it arrives earlier
      expect(result.transfers).toBe(0)
      expect(result.endTime).toBe('2025-01-15T13:30:00Z')
    })

    it('with equal transfers, prefers arrival closest to target', () => {
      const trips: OjpTrip[] = [
        createTrip('2025-01-15T13:00:00Z', 1), // On time, 1 transfer, early
        createTrip('2025-01-15T13:45:00Z', 1), // On time, 1 transfer, closer to target
        createTrip('2025-01-15T13:30:00Z', 1), // On time, 1 transfer, in between
      ]

      const result = selectBestTrip(trips, targetArrivalTime)

      // Should prefer the trip arriving at 13:45 (closest to 14:00 target)
      expect(result.endTime).toBe('2025-01-15T13:45:00Z')
    })

    it('returns first trip if no trips arrive on time', () => {
      const trips: OjpTrip[] = [
        createTrip('2025-01-15T14:15:00Z', 0), // Late
        createTrip('2025-01-15T14:30:00Z', 1), // Later
        createTrip('2025-01-15T15:00:00Z', 0), // Even later
      ]

      const result = selectBestTrip(trips, targetArrivalTime)

      // Falls back to first trip
      expect(result).toBe(trips[0])
    })

    it('includes trips arriving exactly at target time', () => {
      const trips: OjpTrip[] = [
        createTrip('2025-01-15T14:00:00Z', 1), // Exactly on time
        createTrip('2025-01-15T13:30:00Z', 0), // Early
      ]

      const result = selectBestTrip(trips, targetArrivalTime)

      // 0 transfers wins
      expect(result.transfers).toBe(0)
    })

    it('handles complex scenario with multiple criteria', () => {
      const trips: OjpTrip[] = [
        createTrip('2025-01-15T13:00:00Z', 2), // On time, 2 transfers
        createTrip('2025-01-15T14:30:00Z', 0), // Late, 0 transfers
        createTrip('2025-01-15T13:50:00Z', 1), // On time, 1 transfer, close to target
        createTrip('2025-01-15T13:30:00Z', 1), // On time, 1 transfer, earlier
        createTrip('2025-01-15T13:45:00Z', 0), // On time, 0 transfers
      ]

      const result = selectBestTrip(trips, targetArrivalTime)

      // Should select: 0 transfers, arrives at 13:45 (only on-time trip with 0 transfers)
      expect(result.transfers).toBe(0)
      expect(result.endTime).toBe('2025-01-15T13:45:00Z')
    })
  })
})

describe('extractDestinationStation', () => {
  const baseTrip: OjpTrip = {
    duration: 'PT1H',
    startTime: '2025-01-15T12:00:00Z',
    endTime: '2025-01-15T13:00:00Z',
    transfers: 0,
    leg: [],
  }

  it('returns undefined when no timed legs exist', () => {
    const result = extractDestinationStation(baseTrip)
    expect(result).toBeUndefined()
  })

  it('returns undefined when leg array is empty', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [],
    }
    const result = extractDestinationStation(trip)
    expect(result).toBeUndefined()
  })

  it("extracts station from last timed leg's legAlight with sloid format", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'ch:1:sloid:8503000',
              stopPointName: { text: 'Zürich HB' },
            },
            legAlight: {
              stopPointRef: 'ch:1:sloid:8507000',
              stopPointName: { text: 'Bern' },
            },
          },
        },
      ],
    }

    const result = extractDestinationStation(trip)
    expect(result).toEqual({ id: '8507000', name: 'Bern' })
  })

  it('handles sloid format with additional segments', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'ch:1:sloid:8503000:1',
              stopPointName: { text: 'Zürich HB' },
            },
            legAlight: {
              stopPointRef: 'ch:1:sloid:8507000:2:3',
              stopPointName: { text: 'Bern, Gleis 1' },
            },
          },
        },
      ],
    }

    const result = extractDestinationStation(trip)
    expect(result).toEqual({ id: '8507000', name: 'Bern, Gleis 1' })
  })

  it('handles direct numeric ID', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: '8503000',
              stopPointName: { text: 'Zürich HB' },
            },
            legAlight: {
              stopPointRef: '8507000',
              stopPointName: { text: 'Bern' },
            },
          },
        },
      ],
    }

    const result = extractDestinationStation(trip)
    expect(result).toEqual({ id: '8507000', name: 'Bern' })
  })

  it('returns undefined for unrecognized ref format', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'unknown:format:ref',
              stopPointName: { text: 'Origin' },
            },
            legAlight: {
              stopPointRef: 'unknown:format:ref',
              stopPointName: { text: 'Some Place' },
            },
          },
        },
      ],
    }

    const result = extractDestinationStation(trip)
    expect(result).toBeUndefined()
  })

  it('uses last timed leg when multiple legs exist', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'ch:1:sloid:8503000',
              stopPointName: { text: 'Zürich HB' },
            },
            legAlight: {
              stopPointRef: 'ch:1:sloid:8500218',
              stopPointName: { text: 'Olten' },
            },
          },
        },
        {}, // Transfer leg (no timedLeg)
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'ch:1:sloid:8500218',
              stopPointName: { text: 'Olten' },
            },
            legAlight: {
              stopPointRef: 'ch:1:sloid:8507000',
              stopPointName: { text: 'Bern' },
            },
          },
        },
      ],
    }

    const result = extractDestinationStation(trip)
    expect(result).toEqual({ id: '8507000', name: 'Bern' })
  })

  it('skips non-timed legs', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {}, // Walking leg (no timedLeg)
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'ch:1:sloid:8503000',
              stopPointName: { text: 'Zürich HB' },
            },
            legAlight: {
              stopPointRef: 'ch:1:sloid:8507000',
              stopPointName: { text: 'Bern' },
            },
          },
        },
        {}, // Walking leg at end (no timedLeg)
      ],
    }

    const result = extractDestinationStation(trip)
    expect(result).toEqual({ id: '8507000', name: 'Bern' })
  })

  it('combines stopPointName with nameSuffix when present', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'ch:1:sloid:8503000',
              stopPointName: { text: 'Zürich HB' },
            },
            legAlight: {
              stopPointRef: 'ch:1:sloid:8502206',
              stopPointName: { text: 'Schönenwerd' },
              nameSuffix: { text: 'SO, Bahnhof' },
            },
          },
        },
      ],
    }

    const result = extractDestinationStation(trip)
    expect(result).toEqual({ id: '8502206', name: 'Schönenwerd SO, Bahnhof' })
  })

  it('filters out ALTERNATIVE_TRANSPORT from nameSuffix', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'ch:1:sloid:8503000',
              stopPointName: { text: 'Zürich HB' },
            },
            legAlight: {
              stopPointRef: 'ch:1:sloid:90727',
              stopPointName: { text: 'Oberengstringen, Paradies' },
              nameSuffix: { text: 'ALTERNATIVE_TRANSPORT' },
            },
          },
        },
      ],
    }

    const result = extractDestinationStation(trip)
    expect(result).toEqual({ id: '90727', name: 'Oberengstringen, Paradies' })
  })

  it('filters out PLATFORM_ACCESS_WITH_ASSISTANCE from nameSuffix', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'ch:1:sloid:8503000',
              stopPointName: { text: 'Zürich HB' },
            },
            legAlight: {
              stopPointRef: 'ch:1:sloid:73232',
              stopPointName: { text: 'Kloten, Freienberg' },
              nameSuffix: { text: 'PLATFORM_ACCESS_WITH_ASSISTANCE' },
            },
          },
        },
      ],
    }

    const result = extractDestinationStation(trip)
    expect(result).toEqual({ id: '73232', name: 'Kloten, Freienberg' })
  })

  it('filters out PLATFORM_ACCESS_WITH_ASSISTANCE_WHEN_NOTIFIED from nameSuffix', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'ch:1:sloid:8503000',
              stopPointName: { text: 'Zürich HB' },
            },
            legAlight: {
              stopPointRef: 'ch:1:sloid:1121',
              stopPointName: { text: 'Pully' },
              nameSuffix: { text: 'PLATFORM_ACCESS_WITH_ASSISTANCE_WHEN_NOTIFIED' },
            },
          },
        },
      ],
    }

    const result = extractDestinationStation(trip)
    expect(result).toEqual({ id: '1121', name: 'Pully' })
  })

  it('filters out PLATFORM_ACCESS_WITHOUT_ASSISTANCE from nameSuffix', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'ch:1:sloid:8503000',
              stopPointName: { text: 'Zürich HB' },
            },
            legAlight: {
              stopPointRef: 'ch:1:sloid:2112',
              stopPointName: { text: 'Schönenwerd' },
              nameSuffix: { text: 'SO PLATFORM_ACCESS_WITHOUT_ASSISTANCE' },
            },
          },
        },
      ],
    }

    const result = extractDestinationStation(trip)
    expect(result).toEqual({ id: '2112', name: 'Schönenwerd SO' })
  })

  it('filters out PLATFORM_NOT_WHEELCHAIR_ACCESSIBLE from nameSuffix', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'ch:1:sloid:8501121',
              stopPointName: { text: 'Pully' },
            },
            legAlight: {
              stopPointRef: 'ch:1:sloid:8502113',
              stopPointName: { text: 'Aarau' },
              nameSuffix: { text: 'PLATFORM_NOT_WHEELCHAIR_ACCESSIBLE' },
            },
          },
        },
      ],
    }

    const result = extractDestinationStation(trip)
    expect(result).toEqual({ id: '8502113', name: 'Aarau' })
  })

  it('removes accessibility keyword from end of nameSuffix', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'ch:1:sloid:8503000',
              stopPointName: { text: 'Zürich HB' },
            },
            legAlight: {
              stopPointRef: 'ch:1:sloid:8502206',
              stopPointName: { text: 'Schönenwerd' },
              nameSuffix: { text: 'SO, Bahnhof ALTERNATIVE_TRANSPORT' },
            },
          },
        },
      ],
    }

    const result = extractDestinationStation(trip)
    expect(result).toEqual({ id: '8502206', name: 'Schönenwerd SO, Bahnhof' })
  })

  it('removes multiple accessibility keywords from end of nameSuffix', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'ch:1:sloid:8503000',
              stopPointName: { text: 'Zürich HB' },
            },
            legAlight: {
              stopPointRef: 'ch:1:sloid:8502206',
              stopPointName: { text: 'Schönenwerd' },
              nameSuffix: { text: 'SO, Bahnhof WHEELCHAIR_ACCESS ALTERNATIVE_TRANSPORT' },
            },
          },
        },
      ],
    }

    const result = extractDestinationStation(trip)
    expect(result).toEqual({ id: '8502206', name: 'Schönenwerd SO, Bahnhof' })
  })

  it('uses only stopPointName when nameSuffix is not present', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'ch:1:sloid:8503000',
              stopPointName: { text: 'Zürich HB' },
            },
            legAlight: {
              stopPointRef: 'ch:1:sloid:8507000',
              stopPointName: { text: 'Bern' },
            },
          },
        },
      ],
    }

    const result = extractDestinationStation(trip)
    expect(result).toEqual({ id: '8507000', name: 'Bern' })
  })
})

describe('extractOriginStation', () => {
  const baseTrip: OjpTrip = {
    duration: 'PT1H',
    startTime: '2025-01-15T12:00:00Z',
    endTime: '2025-01-15T13:00:00Z',
    transfers: 0,
    leg: [],
  }

  it('returns undefined when no timed legs exist', () => {
    const result = extractOriginStation(baseTrip)
    expect(result).toBeUndefined()
  })

  it("extracts station from first timed leg's legBoard", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'ch:1:sloid:8503000',
              stopPointName: { text: 'Zürich HB' },
            },
            legAlight: {
              stopPointRef: 'ch:1:sloid:8507000',
              stopPointName: { text: 'Bern' },
            },
          },
        },
      ],
    }

    const result = extractOriginStation(trip)
    expect(result).toEqual({ id: '8503000', name: 'Zürich HB' })
  })

  it('uses first timed leg when multiple legs exist', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {}, // Walking leg at start (no timedLeg)
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'ch:1:sloid:8503000',
              stopPointName: { text: 'Zürich HB' },
            },
            legAlight: {
              stopPointRef: 'ch:1:sloid:8500218',
              stopPointName: { text: 'Olten' },
            },
          },
        },
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'ch:1:sloid:8500218',
              stopPointName: { text: 'Olten' },
            },
            legAlight: {
              stopPointRef: 'ch:1:sloid:8507000',
              stopPointName: { text: 'Bern' },
            },
          },
        },
      ],
    }

    const result = extractOriginStation(trip)
    expect(result).toEqual({ id: '8503000', name: 'Zürich HB' })
  })

  it('combines stopPointName with nameSuffix when present', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: 'ch:1:sloid:8502206',
              stopPointName: { text: 'Schönenwerd' },
              nameSuffix: { text: 'SO, Bahnhof' },
            },
            legAlight: {
              stopPointRef: 'ch:1:sloid:8507000',
              stopPointName: { text: 'Bern' },
            },
          },
        },
      ],
    }

    const result = extractOriginStation(trip)
    expect(result).toEqual({ id: '8502206', name: 'Schönenwerd SO, Bahnhof' })
  })
})

describe('extractFinalWalkingMinutes', () => {
  const baseTrip: OjpTrip = {
    duration: 'PT1H',
    startTime: '2025-01-15T12:00:00Z',
    endTime: '2025-01-15T13:00:00Z',
    transfers: 0,
    leg: [],
  }

  it('returns 0 when no legs exist', () => {
    const result = extractFinalWalkingMinutes(baseTrip)
    expect(result).toBe(0)
  })

  it('returns 0 when no timed legs exist', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [{ continuousLeg: { duration: 'PT10M' } }],
    }
    const result = extractFinalWalkingMinutes(trip)
    expect(result).toBe(0)
  })

  it('returns 0 when trip ends with a timed leg', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: { stopPointRef: 'ch:1:sloid:8503000', stopPointName: { text: 'Zürich HB' } },
            legAlight: { stopPointRef: 'ch:1:sloid:8507000', stopPointName: { text: 'Bern' } },
          },
        },
      ],
    }
    const result = extractFinalWalkingMinutes(trip)
    expect(result).toBe(0)
  })

  it('extracts walking time from final continuousLeg', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: { stopPointRef: 'ch:1:sloid:8503000', stopPointName: { text: 'Zürich HB' } },
            legAlight: { stopPointRef: 'ch:1:sloid:8507000', stopPointName: { text: 'Bern' } },
          },
        },
        { continuousLeg: { duration: 'PT5M' } },
      ],
    }
    const result = extractFinalWalkingMinutes(trip)
    expect(result).toBe(5)
  })

  it('extracts walking time with hours and minutes', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: { stopPointRef: 'ch:1:sloid:8503000', stopPointName: { text: 'Zürich HB' } },
            legAlight: { stopPointRef: 'ch:1:sloid:8507000', stopPointName: { text: 'Bern' } },
          },
        },
        { continuousLeg: { duration: 'PT1H15M' } },
      ],
    }
    const result = extractFinalWalkingMinutes(trip)
    expect(result).toBe(75)
  })

  it('sums multiple continuous legs after last timed leg', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: { stopPointRef: 'ch:1:sloid:8503000', stopPointName: { text: 'Zürich HB' } },
            legAlight: { stopPointRef: 'ch:1:sloid:8507000', stopPointName: { text: 'Bern' } },
          },
        },
        { continuousLeg: { duration: 'PT3M' } },
        { continuousLeg: { duration: 'PT7M' } },
      ],
    }
    const result = extractFinalWalkingMinutes(trip)
    expect(result).toBe(10)
  })

  it('ignores continuous legs before the last timed leg', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        { continuousLeg: { duration: 'PT10M' } }, // Initial walk to station
        {
          timedLeg: {
            legBoard: { stopPointRef: 'ch:1:sloid:8503000', stopPointName: { text: 'Zürich HB' } },
            legAlight: { stopPointRef: 'ch:1:sloid:8500218', stopPointName: { text: 'Olten' } },
          },
        },
        { continuousLeg: { duration: 'PT2M' } }, // Transfer walk
        {
          timedLeg: {
            legBoard: { stopPointRef: 'ch:1:sloid:8500218', stopPointName: { text: 'Olten' } },
            legAlight: { stopPointRef: 'ch:1:sloid:8507000', stopPointName: { text: 'Bern' } },
          },
        },
        { continuousLeg: { duration: 'PT8M' } }, // Final walk to destination
      ],
    }
    const result = extractFinalWalkingMinutes(trip)
    // Should only count the 8 minutes after the last timed leg
    expect(result).toBe(8)
  })

  it('handles legs without continuousLeg property', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: { stopPointRef: 'ch:1:sloid:8503000', stopPointName: { text: 'Zürich HB' } },
            legAlight: { stopPointRef: 'ch:1:sloid:8507000', stopPointName: { text: 'Bern' } },
          },
        },
        {}, // Empty leg (transfer leg without continuousLeg)
        { continuousLeg: { duration: 'PT5M' } },
      ],
    }
    const result = extractFinalWalkingMinutes(trip)
    expect(result).toBe(5)
  })
})

describe('calculateActualArrivalTime', () => {
  const baseTrip: OjpTrip = {
    duration: 'PT1H',
    startTime: '2025-01-15T12:00:00Z',
    endTime: '2025-01-15T13:00:00Z',
    transfers: 0,
    leg: [],
  }

  it('returns endTime when no walking after last timed leg', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: { stopPointRef: 'ch:1:sloid:8503000', stopPointName: { text: 'Zürich HB' } },
            legAlight: { stopPointRef: 'ch:1:sloid:8507000', stopPointName: { text: 'Bern' } },
          },
        },
      ],
    }
    const result = calculateActualArrivalTime(trip)
    expect(result).toBe('2025-01-15T13:00:00Z')
  })

  it('adds walking time to endTime', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      endTime: '2025-01-15T13:00:00.000Z',
      leg: [
        {
          timedLeg: {
            legBoard: { stopPointRef: 'ch:1:sloid:8503000', stopPointName: { text: 'Zürich HB' } },
            legAlight: { stopPointRef: 'ch:1:sloid:8507000', stopPointName: { text: 'Bern' } },
          },
        },
        { continuousLeg: { duration: 'PT10M' } },
      ],
    }
    const result = calculateActualArrivalTime(trip)
    // 13:00 + 10 minutes = 13:10
    expect(new Date(result).toISOString()).toBe('2025-01-15T13:10:00.000Z')
  })

  it('handles crossing hour boundary', () => {
    const trip: OjpTrip = {
      ...baseTrip,
      endTime: '2025-01-15T13:55:00.000Z',
      leg: [
        {
          timedLeg: {
            legBoard: { stopPointRef: 'ch:1:sloid:8503000', stopPointName: { text: 'Zürich HB' } },
            legAlight: { stopPointRef: 'ch:1:sloid:8507000', stopPointName: { text: 'Bern' } },
          },
        },
        { continuousLeg: { duration: 'PT15M' } },
      ],
    }
    const result = calculateActualArrivalTime(trip)
    // 13:55 + 15 minutes = 14:10
    expect(new Date(result).toISOString()).toBe('2025-01-15T14:10:00.000Z')
  })
})

describe('selectBestTrip with walking time', () => {
  // Helper to create trip objects with walking legs
  const createTripWithWalking = (
    endTime: string,
    transfers: number,
    finalWalkingMinutes: number,
    duration = 'PT1H',
    startTime = '2025-01-15T12:00:00Z'
  ): OjpTrip => ({
    duration,
    startTime,
    endTime,
    transfers,
    leg: [
      {
        timedLeg: {
          legBoard: { stopPointRef: 'ch:1:sloid:8503000', stopPointName: { text: 'Zürich HB' } },
          legAlight: { stopPointRef: 'ch:1:sloid:8507000', stopPointName: { text: 'Bern' } },
        },
      },
      ...(finalWalkingMinutes > 0
        ? [{ continuousLeg: { duration: `PT${finalWalkingMinutes}M` } }]
        : []),
    ],
  })

  it('excludes trips that arrive late due to walking time', () => {
    const targetArrivalTime = new Date('2025-01-15T14:00:00Z')
    const trips: OjpTrip[] = [
      // Arrives at station 13:55, + 10 min walk = 14:05 (late)
      createTripWithWalking('2025-01-15T13:55:00Z', 0, 10),
      // Arrives at station 13:45, + 10 min walk = 13:55 (on time)
      createTripWithWalking('2025-01-15T13:45:00Z', 1, 10),
    ]

    const result = selectBestTrip(trips, targetArrivalTime)

    // Should select the second trip because first is late after walking
    expect(result.endTime).toBe('2025-01-15T13:45:00Z')
  })

  it('considers walking time when comparing arrival proximity', () => {
    const targetArrivalTime = new Date('2025-01-15T14:00:00Z')
    const trips: OjpTrip[] = [
      // Arrives at station 13:50, no walking = 13:50 actual
      createTripWithWalking('2025-01-15T13:50:00Z', 1, 0),
      // Arrives at station 13:45, + 10 min walk = 13:55 actual (closer to target)
      createTripWithWalking('2025-01-15T13:45:00Z', 1, 10),
    ]

    const result = selectBestTrip(trips, targetArrivalTime)

    // With same transfers, should prefer the one arriving closer to target (13:55 vs 13:50)
    expect(result.endTime).toBe('2025-01-15T13:45:00Z')
  })
})
