import { describe, it, expect } from 'vitest'

import {
  adaptTripForEbikeTrain,
  selectBestEbikeTrainTrip,
  estimateBikeMinutes,
  estimateBikeDistanceKm,
  EBIKE_AVERAGE_SPEED_KMH,
} from './ebike-trip-adapter'

import type { OjpLeg, OjpTrip } from './ojp-trip-helpers'
import type { Coordinates } from './types'

// Home in Zurich Altstetten area, ~1.1km south of the "origin station"
const HOME: Coordinates = { latitude: 47.38, longitude: 8.48 }
const ORIGIN_STATION = { latitude: 47.39, longitude: 8.48 }

// Hall in Bern area, ~2.2km north of the "destination station"
const DESTINATION_STATION = { latitude: 46.95, longitude: 7.44 }
const HALL: Coordinates = { latitude: 46.97, longitude: 7.44 }

const TRAIN_DEPARTURE = '2026-01-10T10:00:00.000Z'
const TRAIN_ARRIVAL = '2026-01-10T11:00:00.000Z'

function makeRailLeg(
  overrides: {
    boardRef?: string
    boardName?: string
    alightRef?: string
    alightName?: string
    departure?: string
    arrival?: string
    ptMode?: string
  } = {}
): OjpLeg {
  return {
    timedLeg: {
      legBoard: {
        stopPointRef: overrides.boardRef ?? 'ch:1:sloid:8503000',
        stopPointName: { text: overrides.boardName ?? 'Zürich HB' },
        serviceDeparture: { timetabledTime: overrides.departure ?? TRAIN_DEPARTURE },
      },
      legAlight: {
        stopPointRef: overrides.alightRef ?? 'ch:1:sloid:8507000',
        stopPointName: { text: overrides.alightName ?? 'Bern' },
        serviceArrival: { timetabledTime: overrides.arrival ?? TRAIN_ARRIVAL },
      },
      service: { mode: { ptMode: overrides.ptMode ?? 'rail' } },
    },
  }
}

function makeWalkLeg(
  start: { latitude: number; longitude: number } | undefined,
  end: { latitude: number; longitude: number } | undefined,
  duration = 'PT10M'
): OjpLeg {
  return {
    continuousLeg: {
      duration,
      legStart: start
        ? { geoPosition: { latitude: start.latitude, longitude: start.longitude } }
        : {},
      legEnd: end ? { geoPosition: { latitude: end.latitude, longitude: end.longitude } } : {},
    },
  }
}

function makeTrip(legs: OjpLeg[], overrides: Partial<OjpTrip> = {}): OjpTrip {
  return {
    duration: 'PT1H20M',
    startTime: TRAIN_DEPARTURE,
    endTime: TRAIN_ARRIVAL,
    transfers: 0,
    leg: legs,
    ...overrides,
  }
}

/** Standard walk-rail-walk trip used across tests */
function makeStandardTrip(): OjpTrip {
  return makeTrip([
    makeWalkLeg(HOME, ORIGIN_STATION),
    makeRailLeg(),
    makeWalkLeg(DESTINATION_STATION, HALL),
  ])
}

describe('estimateBikeMinutes', () => {
  it('converts distance to minutes at the e-bike average speed', () => {
    expect(estimateBikeMinutes(EBIKE_AVERAGE_SPEED_KMH)).toBe(60)
    expect(estimateBikeMinutes(0)).toBe(0)
  })

  it('rounds up to whole minutes', () => {
    // 1 km at 25 km/h = 2.4 minutes -> 3
    expect(estimateBikeMinutes(1)).toBe(3)
  })
})

describe('estimateBikeDistanceKm', () => {
  it('applies the road distance multiplier to the straight-line distance', () => {
    const distance = estimateBikeDistanceKm(HOME, ORIGIN_STATION)
    // 0.01° latitude ≈ 1.11 km straight line, times 1.33 road multiplier
    expect(distance).toBeGreaterThan(1.3)
    expect(distance).toBeLessThan(1.7)
  })
})

describe('adaptTripForEbikeTrain', () => {
  it('adapts a walk-rail-walk trip with cycling legs around the rail portion', () => {
    const adaptation = adaptTripForEbikeTrain(makeStandardTrip(), HOME, HALL, 15)

    expect(adaptation).toBeDefined()
    expect(adaptation!.transfers).toBe(0)
    expect(adaptation!.originStation).toEqual({ id: '8503000', name: 'Zürich HB' })
    expect(adaptation!.destinationStation).toEqual({ id: '8507000', name: 'Bern' })

    expect(adaptation!.bikeLegs.toStationKm).toBeGreaterThan(0)
    expect(adaptation!.bikeLegs.fromStationKm).toBeGreaterThan(0)
    expect(adaptation!.bikeLegs.toStationMinutes).toBeGreaterThan(0)
    expect(adaptation!.bikeLegs.fromStationMinutes).toBeGreaterThan(0)

    // Departure is earlier than train departure by the cycling time
    expect(new Date(adaptation!.departureTime).getTime()).toBe(
      new Date(TRAIN_DEPARTURE).getTime() - adaptation!.bikeLegs.toStationMinutes * 60_000
    )
    // Arrival is later than train arrival by the cycling time
    expect(new Date(adaptation!.arrivalTime).getTime()).toBe(
      new Date(TRAIN_ARRIVAL).getTime() + adaptation!.bikeLegs.fromStationMinutes * 60_000
    )
    // Duration covers both cycling legs plus the train ride (60 min)
    expect(adaptation!.durationMinutes).toBe(
      60 + adaptation!.bikeLegs.toStationMinutes + adaptation!.bikeLegs.fromStationMinutes
    )
    expect(adaptation!.sourceTrip).toBeDefined()
  })

  it('replaces a feeder bus with cycling to the rail station', () => {
    // home -> walk -> bus -> transfer -> rail -> walk -> hall
    const busLeg: OjpLeg = {
      timedLeg: {
        legBoard: {
          stopPointRef: 'ch:1:sloid:1111111',
          stopPointName: { text: 'Bus Stop' },
          serviceDeparture: { timetabledTime: '2026-01-10T09:30:00.000Z' },
        },
        legAlight: {
          stopPointRef: 'ch:1:sloid:2222222',
          stopPointName: { text: 'Near Station' },
          serviceArrival: { timetabledTime: '2026-01-10T09:45:00.000Z' },
        },
        service: { mode: { ptMode: 'bus' } },
      },
    }
    const transferToRail: OjpLeg = {
      transferLeg: {
        duration: 'PT5M',
        legStart: { geoPosition: { latitude: 47.3899, longitude: 8.4799 } },
        legEnd: {
          geoPosition: { latitude: ORIGIN_STATION.latitude, longitude: ORIGIN_STATION.longitude },
        },
      },
    }
    const trip = makeTrip([
      makeWalkLeg(HOME, { latitude: 47.381, longitude: 8.48 }),
      busLeg,
      transferToRail,
      makeRailLeg(),
      makeWalkLeg(DESTINATION_STATION, HALL),
    ])

    const adaptation = adaptTripForEbikeTrain(trip, HOME, HALL, 15)

    expect(adaptation).toBeDefined()
    // Bus leg is not part of the rail portion: transfers stay 0
    expect(adaptation!.transfers).toBe(0)
    expect(adaptation!.originStation?.id).toBe('8503000')
    // Cycling goes to the rail station, not the bus stop
    expect(adaptation!.bikeLegs.toStationKm).toBeGreaterThan(1)
  })

  it('counts transfers within a multi-leg rail portion', () => {
    const trip = makeTrip([
      makeWalkLeg(HOME, ORIGIN_STATION),
      makeRailLeg({ arrival: '2026-01-10T10:30:00.000Z' }),
      {
        transferLeg: {
          duration: 'PT4M',
          legStart: { geoPosition: { latitude: 47.05, longitude: 8.3 } },
          legEnd: { geoPosition: { latitude: 47.05, longitude: 8.3 } },
        },
      },
      makeRailLeg({ departure: '2026-01-10T10:40:00.000Z' }),
      makeWalkLeg(DESTINATION_STATION, HALL),
    ])

    const adaptation = adaptTripForEbikeTrain(trip, HOME, HALL, 15)

    expect(adaptation).toBeDefined()
    expect(adaptation!.transfers).toBe(1)
  })

  it('returns undefined when the trip has no rail leg', () => {
    const trip = makeTrip([
      makeWalkLeg(HOME, ORIGIN_STATION),
      makeRailLeg({ ptMode: 'bus' }),
      makeWalkLeg(DESTINATION_STATION, HALL),
    ])

    expect(adaptTripForEbikeTrain(trip, HOME, HALL, 15)).toBeUndefined()
  })

  it('returns undefined when a non-rail segment sits between rail legs', () => {
    const trip = makeTrip([
      makeWalkLeg(HOME, ORIGIN_STATION),
      makeRailLeg({ arrival: '2026-01-10T10:20:00.000Z' }),
      makeRailLeg({ ptMode: 'bus' }),
      makeRailLeg({ departure: '2026-01-10T10:40:00.000Z' }),
      makeWalkLeg(DESTINATION_STATION, HALL),
    ])

    expect(adaptTripForEbikeTrain(trip, HOME, HALL, 15)).toBeUndefined()
  })

  it('returns undefined when a cycling leg exceeds the maximum distance', () => {
    // Destination station ~2.2km straight line -> ~3km road distance from hall
    expect(adaptTripForEbikeTrain(makeStandardTrip(), HOME, HALL, 2)).toBeUndefined()
  })

  it('returns undefined when station coordinates are missing', () => {
    const trip = makeTrip([
      makeWalkLeg(HOME, undefined),
      makeRailLeg(),
      makeWalkLeg(DESTINATION_STATION, HALL),
    ])

    expect(adaptTripForEbikeTrain(trip, HOME, HALL, 15)).toBeUndefined()
  })

  it('returns undefined when the rail leg has no departure time', () => {
    const trip = makeStandardTrip()
    delete trip.leg[1]!.timedLeg!.legBoard.serviceDeparture

    expect(adaptTripForEbikeTrain(trip, HOME, HALL, 15)).toBeUndefined()
  })

  it('uses zero-length cycling legs when the trip starts or ends at the station', () => {
    const trip = makeTrip([makeRailLeg()])

    const adaptation = adaptTripForEbikeTrain(trip, HOME, HALL, 15)

    expect(adaptation).toBeDefined()
    expect(adaptation!.bikeLegs.toStationKm).toBe(0)
    expect(adaptation!.bikeLegs.toStationMinutes).toBe(0)
    expect(adaptation!.bikeLegs.fromStationKm).toBe(0)
    expect(adaptation!.bikeLegs.fromStationMinutes).toBe(0)
    expect(adaptation!.durationMinutes).toBe(60)
  })

  it('prefers the estimated time over the timetabled time', () => {
    const trip = makeStandardTrip()
    trip.leg[1]!.timedLeg!.legAlight.serviceArrival = {
      timetabledTime: TRAIN_ARRIVAL,
      estimatedTime: '2026-01-10T11:05:00.000Z',
    }

    const adaptation = adaptTripForEbikeTrain(trip, HOME, HALL, 15)

    expect(new Date(adaptation!.arrivalTime).getTime()).toBe(
      new Date('2026-01-10T11:05:00.000Z').getTime() +
        adaptation!.bikeLegs.fromStationMinutes * 60_000
    )
  })
})

describe('selectBestEbikeTrainTrip', () => {
  it('returns undefined when no trip can be adapted', () => {
    const busOnly = makeTrip([
      makeWalkLeg(HOME, ORIGIN_STATION),
      makeRailLeg({ ptMode: 'bus' }),
      makeWalkLeg(DESTINATION_STATION, HALL),
    ])

    expect(selectBestEbikeTrainTrip([busOnly], HOME, HALL, 15)).toBeUndefined()
  })

  it('returns the first adaptable trip without a target arrival time', () => {
    const first = makeStandardTrip()
    const second = makeTrip([
      makeWalkLeg(HOME, ORIGIN_STATION),
      makeRailLeg({ departure: '2026-01-10T11:00:00.000Z', arrival: '2026-01-10T12:00:00.000Z' }),
      makeWalkLeg(DESTINATION_STATION, HALL),
    ])

    const adaptation = selectBestEbikeTrainTrip([first, second], HOME, HALL, 15)

    expect(new Date(adaptation!.departureTime).getTime()).toBeLessThan(
      new Date('2026-01-10T11:00:00.000Z').getTime()
    )
  })

  it('selects the latest on-time arrival for a target arrival time', () => {
    const early = makeStandardTrip()
    const later = makeTrip([
      makeWalkLeg(HOME, ORIGIN_STATION),
      makeRailLeg({ departure: '2026-01-10T11:00:00.000Z', arrival: '2026-01-10T12:00:00.000Z' }),
      makeWalkLeg(DESTINATION_STATION, HALL),
    ])
    const tooLate = makeTrip([
      makeWalkLeg(HOME, ORIGIN_STATION),
      makeRailLeg({ departure: '2026-01-10T13:00:00.000Z', arrival: '2026-01-10T14:00:00.000Z' }),
      makeWalkLeg(DESTINATION_STATION, HALL),
    ])

    const adaptation = selectBestEbikeTrainTrip(
      [early, later, tooLate],
      HOME,
      HALL,
      15,
      new Date('2026-01-10T12:30:00.000Z')
    )

    // The 12:00 arrival (plus cycling) is the latest one still on time
    expect(new Date(adaptation!.arrivalTime).getTime()).toBeGreaterThan(
      new Date('2026-01-10T12:00:00.000Z').getTime()
    )
    expect(new Date(adaptation!.arrivalTime).getTime()).toBeLessThanOrEqual(
      new Date('2026-01-10T12:30:00.000Z').getTime()
    )
  })

  it('falls back to the first adaptation when nothing arrives on time', () => {
    const trip = makeStandardTrip()

    const adaptation = selectBestEbikeTrainTrip(
      [trip],
      HOME,
      HALL,
      15,
      new Date('2026-01-10T09:00:00.000Z')
    )

    expect(adaptation).toBeDefined()
  })
})
