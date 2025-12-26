/**
 * Tests for OJP client functions.
 */

import { describe, it, expect } from "vitest";
import { selectBestTrip, type OjpTrip } from "./ojp-client";

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
