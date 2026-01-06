/**
 * Tests for OJP client functions.
 */

import { describe, it, expect } from "vitest";
import { selectBestTrip, extractDestinationStation, extractOriginStation, type OjpTrip } from "./ojp-client";

describe("selectBestTrip", () => {
  // Helper to create trip objects
  const createTrip = (
    endTime: string,
    transfers: number,
    duration = "PT1H",
    startTime = "2025-01-15T12:00:00Z",
  ): OjpTrip => ({
    duration,
    startTime,
    endTime,
    transfers,
    leg: [],
  });

  describe("without target arrival time", () => {
    it("returns the first trip (earliest departure)", () => {
      const trips: OjpTrip[] = [
        createTrip("2025-01-15T13:00:00Z", 1),
        createTrip("2025-01-15T13:30:00Z", 0),
        createTrip("2025-01-15T14:00:00Z", 2),
      ];

      const result = selectBestTrip(trips);

      expect(result).toBe(trips[0]);
    });
  });

  describe("with target arrival time", () => {
    const targetArrivalTime = new Date("2025-01-15T14:00:00Z");

    it("filters out trips that arrive after target", () => {
      const trips: OjpTrip[] = [
        createTrip("2025-01-15T14:30:00Z", 0), // Too late
        createTrip("2025-01-15T13:45:00Z", 1), // On time
        createTrip("2025-01-15T15:00:00Z", 0), // Too late
      ];

      const result = selectBestTrip(trips, targetArrivalTime);

      expect(result.endTime).toBe("2025-01-15T13:45:00Z");
    });

    it("prefers fewer transfers over arrival time proximity", () => {
      const trips: OjpTrip[] = [
        createTrip("2025-01-15T13:55:00Z", 2), // On time, 2 transfers, closest to target
        createTrip("2025-01-15T13:30:00Z", 0), // On time, 0 transfers, further from target
        createTrip("2025-01-15T13:45:00Z", 1), // On time, 1 transfer
      ];

      const result = selectBestTrip(trips, targetArrivalTime);

      // Should prefer 0 transfers even though it arrives earlier
      expect(result.transfers).toBe(0);
      expect(result.endTime).toBe("2025-01-15T13:30:00Z");
    });

    it("with equal transfers, prefers arrival closest to target", () => {
      const trips: OjpTrip[] = [
        createTrip("2025-01-15T13:00:00Z", 1), // On time, 1 transfer, early
        createTrip("2025-01-15T13:45:00Z", 1), // On time, 1 transfer, closer to target
        createTrip("2025-01-15T13:30:00Z", 1), // On time, 1 transfer, in between
      ];

      const result = selectBestTrip(trips, targetArrivalTime);

      // Should prefer the trip arriving at 13:45 (closest to 14:00 target)
      expect(result.endTime).toBe("2025-01-15T13:45:00Z");
    });

    it("returns first trip if no trips arrive on time", () => {
      const trips: OjpTrip[] = [
        createTrip("2025-01-15T14:15:00Z", 0), // Late
        createTrip("2025-01-15T14:30:00Z", 1), // Later
        createTrip("2025-01-15T15:00:00Z", 0), // Even later
      ];

      const result = selectBestTrip(trips, targetArrivalTime);

      // Falls back to first trip
      expect(result).toBe(trips[0]);
    });

    it("includes trips arriving exactly at target time", () => {
      const trips: OjpTrip[] = [
        createTrip("2025-01-15T14:00:00Z", 1), // Exactly on time
        createTrip("2025-01-15T13:30:00Z", 0), // Early
      ];

      const result = selectBestTrip(trips, targetArrivalTime);

      // 0 transfers wins
      expect(result.transfers).toBe(0);
    });

    it("handles complex scenario with multiple criteria", () => {
      const trips: OjpTrip[] = [
        createTrip("2025-01-15T13:00:00Z", 2), // On time, 2 transfers
        createTrip("2025-01-15T14:30:00Z", 0), // Late, 0 transfers
        createTrip("2025-01-15T13:50:00Z", 1), // On time, 1 transfer, close to target
        createTrip("2025-01-15T13:30:00Z", 1), // On time, 1 transfer, earlier
        createTrip("2025-01-15T13:45:00Z", 0), // On time, 0 transfers
      ];

      const result = selectBestTrip(trips, targetArrivalTime);

      // Should select: 0 transfers, arrives at 13:45 (only on-time trip with 0 transfers)
      expect(result.transfers).toBe(0);
      expect(result.endTime).toBe("2025-01-15T13:45:00Z");
    });
  });
});

describe("extractDestinationStation", () => {
  const baseTrip: OjpTrip = {
    duration: "PT1H",
    startTime: "2025-01-15T12:00:00Z",
    endTime: "2025-01-15T13:00:00Z",
    transfers: 0,
    leg: [],
  };

  it("returns undefined when no timed legs exist", () => {
    const result = extractDestinationStation(baseTrip);
    expect(result).toBeUndefined();
  });

  it("returns undefined when leg array is empty", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [],
    };
    const result = extractDestinationStation(trip);
    expect(result).toBeUndefined();
  });

  it("extracts station from last timed leg's legAlight with sloid format", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "ch:1:sloid:8503000",
              stopPointName: { text: "Zürich HB" },
            },
            legAlight: {
              stopPointRef: "ch:1:sloid:8507000",
              stopPointName: { text: "Bern" },
            },
          },
        },
      ],
    };

    const result = extractDestinationStation(trip);
    expect(result).toEqual({ id: "8507000", name: "Bern" });
  });

  it("handles sloid format with additional segments", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "ch:1:sloid:8503000:1",
              stopPointName: { text: "Zürich HB" },
            },
            legAlight: {
              stopPointRef: "ch:1:sloid:8507000:2:3",
              stopPointName: { text: "Bern, Gleis 1" },
            },
          },
        },
      ],
    };

    const result = extractDestinationStation(trip);
    expect(result).toEqual({ id: "8507000", name: "Bern, Gleis 1" });
  });

  it("handles direct numeric ID", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "8503000",
              stopPointName: { text: "Zürich HB" },
            },
            legAlight: {
              stopPointRef: "8507000",
              stopPointName: { text: "Bern" },
            },
          },
        },
      ],
    };

    const result = extractDestinationStation(trip);
    expect(result).toEqual({ id: "8507000", name: "Bern" });
  });

  it("returns undefined for unrecognized ref format", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "unknown:format:ref",
              stopPointName: { text: "Origin" },
            },
            legAlight: {
              stopPointRef: "unknown:format:ref",
              stopPointName: { text: "Some Place" },
            },
          },
        },
      ],
    };

    const result = extractDestinationStation(trip);
    expect(result).toBeUndefined();
  });

  it("uses last timed leg when multiple legs exist", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "ch:1:sloid:8503000",
              stopPointName: { text: "Zürich HB" },
            },
            legAlight: {
              stopPointRef: "ch:1:sloid:8500218",
              stopPointName: { text: "Olten" },
            },
          },
        },
        {}, // Transfer leg (no timedLeg)
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "ch:1:sloid:8500218",
              stopPointName: { text: "Olten" },
            },
            legAlight: {
              stopPointRef: "ch:1:sloid:8507000",
              stopPointName: { text: "Bern" },
            },
          },
        },
      ],
    };

    const result = extractDestinationStation(trip);
    expect(result).toEqual({ id: "8507000", name: "Bern" });
  });

  it("skips non-timed legs", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {}, // Walking leg (no timedLeg)
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "ch:1:sloid:8503000",
              stopPointName: { text: "Zürich HB" },
            },
            legAlight: {
              stopPointRef: "ch:1:sloid:8507000",
              stopPointName: { text: "Bern" },
            },
          },
        },
        {}, // Walking leg at end (no timedLeg)
      ],
    };

    const result = extractDestinationStation(trip);
    expect(result).toEqual({ id: "8507000", name: "Bern" });
  });

  it("combines stopPointName with nameSuffix when present", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "ch:1:sloid:8503000",
              stopPointName: { text: "Zürich HB" },
            },
            legAlight: {
              stopPointRef: "ch:1:sloid:8502206",
              stopPointName: { text: "Schönenwerd" },
              nameSuffix: { text: "SO, Bahnhof" },
            },
          },
        },
      ],
    };

    const result = extractDestinationStation(trip);
    expect(result).toEqual({ id: "8502206", name: "Schönenwerd SO, Bahnhof" });
  });

  it("filters out ALTERNATIVE_TRANSPORT from nameSuffix", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "ch:1:sloid:8503000",
              stopPointName: { text: "Zürich HB" },
            },
            legAlight: {
              stopPointRef: "ch:1:sloid:90727",
              stopPointName: { text: "Oberengstringen, Paradies" },
              nameSuffix: { text: "ALTERNATIVE_TRANSPORT" },
            },
          },
        },
      ],
    };

    const result = extractDestinationStation(trip);
    expect(result).toEqual({ id: "90727", name: "Oberengstringen, Paradies" });
  });

  it("filters out PLATFORM_ACCESS_WITH_ASSISTANCE from nameSuffix", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "ch:1:sloid:8503000",
              stopPointName: { text: "Zürich HB" },
            },
            legAlight: {
              stopPointRef: "ch:1:sloid:73232",
              stopPointName: { text: "Kloten, Freienberg" },
              nameSuffix: { text: "PLATFORM_ACCESS_WITH_ASSISTANCE" },
            },
          },
        },
      ],
    };

    const result = extractDestinationStation(trip);
    expect(result).toEqual({ id: "73232", name: "Kloten, Freienberg" });
  });

  it("filters out PLATFORM_ACCESS_WITH_ASSISTANCE_WHEN_NOTIFIED from nameSuffix", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "ch:1:sloid:8503000",
              stopPointName: { text: "Zürich HB" },
            },
            legAlight: {
              stopPointRef: "ch:1:sloid:1121",
              stopPointName: { text: "Pully" },
              nameSuffix: { text: "PLATFORM_ACCESS_WITH_ASSISTANCE_WHEN_NOTIFIED" },
            },
          },
        },
      ],
    };

    const result = extractDestinationStation(trip);
    expect(result).toEqual({ id: "1121", name: "Pully" });
  });

  it("filters out PLATFORM_ACCESS_WITHOUT_ASSISTANCE from nameSuffix", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "ch:1:sloid:8503000",
              stopPointName: { text: "Zürich HB" },
            },
            legAlight: {
              stopPointRef: "ch:1:sloid:2112",
              stopPointName: { text: "Schönenwerd" },
              nameSuffix: { text: "SO PLATFORM_ACCESS_WITHOUT_ASSISTANCE" },
            },
          },
        },
      ],
    };

    const result = extractDestinationStation(trip);
    expect(result).toEqual({ id: "2112", name: "Schönenwerd SO" });
  });

  it("filters out PLATFORM_NOT_WHEELCHAIR_ACCESSIBLE from nameSuffix", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "ch:1:sloid:8501121",
              stopPointName: { text: "Pully" },
            },
            legAlight: {
              stopPointRef: "ch:1:sloid:8502113",
              stopPointName: { text: "Aarau" },
              nameSuffix: { text: "PLATFORM_NOT_WHEELCHAIR_ACCESSIBLE" },
            },
          },
        },
      ],
    };

    const result = extractDestinationStation(trip);
    expect(result).toEqual({ id: "8502113", name: "Aarau" });
  });

  it("removes accessibility keyword from end of nameSuffix", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "ch:1:sloid:8503000",
              stopPointName: { text: "Zürich HB" },
            },
            legAlight: {
              stopPointRef: "ch:1:sloid:8502206",
              stopPointName: { text: "Schönenwerd" },
              nameSuffix: { text: "SO, Bahnhof ALTERNATIVE_TRANSPORT" },
            },
          },
        },
      ],
    };

    const result = extractDestinationStation(trip);
    expect(result).toEqual({ id: "8502206", name: "Schönenwerd SO, Bahnhof" });
  });

  it("removes multiple accessibility keywords from end of nameSuffix", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "ch:1:sloid:8503000",
              stopPointName: { text: "Zürich HB" },
            },
            legAlight: {
              stopPointRef: "ch:1:sloid:8502206",
              stopPointName: { text: "Schönenwerd" },
              nameSuffix: { text: "SO, Bahnhof WHEELCHAIR_ACCESS ALTERNATIVE_TRANSPORT" },
            },
          },
        },
      ],
    };

    const result = extractDestinationStation(trip);
    expect(result).toEqual({ id: "8502206", name: "Schönenwerd SO, Bahnhof" });
  });

  it("uses only stopPointName when nameSuffix is not present", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "ch:1:sloid:8503000",
              stopPointName: { text: "Zürich HB" },
            },
            legAlight: {
              stopPointRef: "ch:1:sloid:8507000",
              stopPointName: { text: "Bern" },
            },
          },
        },
      ],
    };

    const result = extractDestinationStation(trip);
    expect(result).toEqual({ id: "8507000", name: "Bern" });
  });
});

describe("extractOriginStation", () => {
  const baseTrip: OjpTrip = {
    duration: "PT1H",
    startTime: "2025-01-15T12:00:00Z",
    endTime: "2025-01-15T13:00:00Z",
    transfers: 0,
    leg: [],
  };

  it("returns undefined when no timed legs exist", () => {
    const result = extractOriginStation(baseTrip);
    expect(result).toBeUndefined();
  });

  it("extracts station from first timed leg's legBoard", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "ch:1:sloid:8503000",
              stopPointName: { text: "Zürich HB" },
            },
            legAlight: {
              stopPointRef: "ch:1:sloid:8507000",
              stopPointName: { text: "Bern" },
            },
          },
        },
      ],
    };

    const result = extractOriginStation(trip);
    expect(result).toEqual({ id: "8503000", name: "Zürich HB" });
  });

  it("uses first timed leg when multiple legs exist", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {}, // Walking leg at start (no timedLeg)
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "ch:1:sloid:8503000",
              stopPointName: { text: "Zürich HB" },
            },
            legAlight: {
              stopPointRef: "ch:1:sloid:8500218",
              stopPointName: { text: "Olten" },
            },
          },
        },
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "ch:1:sloid:8500218",
              stopPointName: { text: "Olten" },
            },
            legAlight: {
              stopPointRef: "ch:1:sloid:8507000",
              stopPointName: { text: "Bern" },
            },
          },
        },
      ],
    };

    const result = extractOriginStation(trip);
    expect(result).toEqual({ id: "8503000", name: "Zürich HB" });
  });

  it("combines stopPointName with nameSuffix when present", () => {
    const trip: OjpTrip = {
      ...baseTrip,
      leg: [
        {
          timedLeg: {
            legBoard: {
              stopPointRef: "ch:1:sloid:8502206",
              stopPointName: { text: "Schönenwerd" },
              nameSuffix: { text: "SO, Bahnhof" },
            },
            legAlight: {
              stopPointRef: "ch:1:sloid:8507000",
              stopPointName: { text: "Bern" },
            },
          },
        },
      ],
    };

    const result = extractOriginStation(trip);
    expect(result).toEqual({ id: "8502206", name: "Schönenwerd SO, Bahnhof" });
  });
});
