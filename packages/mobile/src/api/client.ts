/**
 * Mock API client implementation for mobile app.
 *
 * Provides a mock implementation that returns placeholder data
 * for demo mode and testing purposes.
 *
 * For real API calls, see realClient.ts which is used when
 * the user is authenticated with the 'api' data source.
 *
 * This client implements the interfaces required by the shared hooks
 * (AssignmentsApiClient, ExchangesApiClient, CompensationsApiClient).
 */

import type { SearchConfiguration, Assignment, CompensationRecord, GameExchange } from '@volleykit/shared/api';

/** Network delay for realistic behavior */
const MOCK_NETWORK_DELAY_MS = 100;

/**
 * Helper to simulate network delay.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock assignment data.
 * Matches the API Assignment schema structure.
 */
const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    __identity: '1',
    refereeGame: {
      __identity: 'rg1',
      game: {
        __identity: 'g1',
        gameNumber: 'G001',
        startingDateTime: '2026-01-20T14:00:00.000+01:00',
        teamHome: { __identity: 'th1', name: 'VC Zürich' },
        teamAway: { __identity: 'ta1', name: 'Volley Luzern' },
        hall: {
          __identity: 'h1',
          name: 'Sports Hall A',
          primaryPostalAddress: {
            combinedAddress: 'Sportstrasse 1, 8000 Zürich',
            city: 'Zürich',
          },
        },
      },
    },
    refereeConvocationStatus: 'active',
    refereePosition: '1SR',
    isOpenEntryInRefereeGameExchange: false,
    hasLastMessageToReferee: false,
    hasLinkedDoubleConvocation: false,
  },
  {
    __identity: '2',
    refereeGame: {
      __identity: 'rg2',
      game: {
        __identity: 'g2',
        gameNumber: 'G002',
        startingDateTime: '2026-01-25T16:00:00.000+01:00',
        teamHome: { __identity: 'th2', name: 'VBC Therwil' },
        teamAway: { __identity: 'ta2', name: 'VC Kanti' },
        hall: {
          __identity: 'h2',
          name: 'Sports Hall B',
          primaryPostalAddress: {
            combinedAddress: 'Hauptstrasse 10, 4106 Therwil',
            city: 'Therwil',
          },
        },
      },
    },
    refereeConvocationStatus: 'active',
    refereePosition: '2SR',
    isOpenEntryInRefereeGameExchange: false,
    hasLastMessageToReferee: false,
    hasLinkedDoubleConvocation: false,
  },
  {
    __identity: '3',
    refereeGame: {
      __identity: 'rg3',
      game: {
        __identity: 'g3',
        gameNumber: 'G003',
        startingDateTime: '2026-02-01T18:00:00.000+01:00',
        teamHome: { __identity: 'th3', name: 'Volley Amriswil' },
        teamAway: { __identity: 'ta3', name: 'VC Schönenwerd' },
        hall: {
          __identity: 'h3',
          name: 'Sports Hall C',
          primaryPostalAddress: {
            combinedAddress: 'Sportweg 5, 8580 Amriswil',
            city: 'Amriswil',
          },
        },
      },
    },
    refereeConvocationStatus: 'cancelled',
    refereePosition: '1SR',
    isOpenEntryInRefereeGameExchange: false,
    hasLastMessageToReferee: false,
    hasLinkedDoubleConvocation: false,
  },
];

/**
 * Mock exchange data.
 * Matches the API GameExchange schema structure.
 */
const MOCK_EXCHANGES: GameExchange[] = [
  {
    __identity: '1',
    refereeGame: {
      __identity: 'rg1',
      game: {
        __identity: 'g1',
        gameNumber: 'G004',
        startingDateTime: '2026-01-22T19:00:00.000+01:00',
        teamHome: { __identity: 'th4', name: 'VC Zürich' },
        teamAway: { __identity: 'ta4', name: 'Volley Düdingen' },
        hall: {
          __identity: 'h4',
          name: 'Sporthalle Hardau',
          primaryPostalAddress: {
            combinedAddress: 'Hardaustrasse 10, 8004 Zürich',
            city: 'Zürich',
          },
        },
      },
    },
    status: 'open',
    refereePosition: '1SR',
    submittedByPerson: { __identity: 'p1', displayName: 'Max Muster' },
    exchangeReason: 'Konflikt mit anderem Termin',
  },
  {
    __identity: '2',
    refereeGame: {
      __identity: 'rg2',
      game: {
        __identity: 'g2',
        gameNumber: 'G005',
        startingDateTime: '2026-01-28T17:00:00.000+01:00',
        teamHome: { __identity: 'th5', name: 'VBC Therwil' },
        teamAway: { __identity: 'ta5', name: 'Sm\'Aesch Pfeffingen' },
        hall: {
          __identity: 'h5',
          name: 'Sporthalle Therwil',
          primaryPostalAddress: {
            combinedAddress: 'Benkenstrasse 5, 4106 Therwil',
            city: 'Therwil',
          },
        },
      },
    },
    status: 'applied',
    refereePosition: '2SR',
    submittedByPerson: { __identity: 'p2', displayName: 'Anna Beispiel' },
  },
  {
    __identity: '3',
    refereeGame: {
      __identity: 'rg3',
      game: {
        __identity: 'g3',
        gameNumber: 'G006',
        startingDateTime: '2026-02-05T15:00:00.000+01:00',
        teamHome: { __identity: 'th6', name: 'Volley Luzern' },
        teamAway: { __identity: 'ta6', name: 'VC Kanti' },
        hall: {
          __identity: 'h6',
          name: 'Sporthalle Utenberg',
          primaryPostalAddress: {
            combinedAddress: 'Utenbergstrasse 24, 6006 Luzern',
            city: 'Luzern',
          },
        },
      },
    },
    status: 'open',
    refereePosition: '1SR',
    submittedByPerson: { __identity: 'p3', displayName: 'Peter Test' },
    exchangeReason: 'Krankheit',
  },
];

/**
 * Mock compensation data.
 * Matches the API CompensationRecord schema structure.
 */
const MOCK_COMPENSATIONS: CompensationRecord[] = [
  {
    __identity: '1',
    refereeGame: {
      __identity: 'rg1',
      game: {
        __identity: 'g1',
        gameNumber: 'G010',
        startingDateTime: '2026-01-10T14:00:00.000+01:00',
        teamHome: { __identity: 'th7', name: 'VC Zürich' },
        teamAway: { __identity: 'ta7', name: 'Volley Luzern' },
        hall: { __identity: 'h7', name: 'Sports Hall A' },
      },
    },
    refereeConvocationStatus: 'active',
    refereePosition: '1SR',
    compensationDate: '2026-01-10T14:00:00.000+01:00',
    convocationCompensation: {
      __identity: 'cc1',
      paymentDone: true,
      gameCompensation: 120,
      travelExpenses: 25,
      gameCompensationFormatted: 'CHF 120.00',
      travelExpensesFormatted: 'CHF 25.00',
      costFormatted: 'CHF 145.00',
      paymentValueDate: '2026-01-15',
    },
  },
  {
    __identity: '2',
    refereeGame: {
      __identity: 'rg2',
      game: {
        __identity: 'g2',
        gameNumber: 'G011',
        startingDateTime: '2026-01-05T16:00:00.000+01:00',
        teamHome: { __identity: 'th8', name: 'VBC Therwil' },
        teamAway: { __identity: 'ta8', name: 'VC Kanti' },
        hall: { __identity: 'h8', name: 'Sports Hall B' },
      },
    },
    refereeConvocationStatus: 'active',
    refereePosition: '2SR',
    compensationDate: '2026-01-05T16:00:00.000+01:00',
    convocationCompensation: {
      __identity: 'cc2',
      paymentDone: false,
      gameCompensation: 95,
      travelExpenses: 30,
      gameCompensationFormatted: 'CHF 95.00',
      travelExpensesFormatted: 'CHF 30.00',
      costFormatted: 'CHF 125.00',
    },
  },
  {
    __identity: '3',
    refereeGame: {
      __identity: 'rg3',
      game: {
        __identity: 'g3',
        gameNumber: 'G012',
        startingDateTime: '2025-12-20T18:00:00.000+01:00',
        teamHome: { __identity: 'th9', name: 'Volley Amriswil' },
        teamAway: { __identity: 'ta9', name: 'VC Schönenwerd' },
        hall: { __identity: 'h9', name: 'Sports Hall C' },
      },
    },
    refereeConvocationStatus: 'active',
    refereePosition: '1SR',
    compensationDate: '2025-12-20T18:00:00.000+01:00',
    convocationCompensation: {
      __identity: 'cc3',
      paymentDone: true,
      gameCompensation: 110,
      travelExpenses: 40,
      gameCompensationFormatted: 'CHF 110.00',
      travelExpensesFormatted: 'CHF 40.00',
      costFormatted: 'CHF 150.00',
      paymentValueDate: '2025-12-28',
    },
  },
];

/**
 * Mobile API client.
 *
 * Provides mock implementations for the shared hook interfaces.
 * Replace with real API calls when auth integration is complete.
 */
export const mobileApiClient = {
  /**
   * Search assignments with optional filtering.
   */
  async searchAssignments(
    _config: SearchConfiguration = {}
  ): Promise<{ items: Assignment[]; totalItemsCount: number }> {
    await delay(MOCK_NETWORK_DELAY_MS);
    return {
      items: MOCK_ASSIGNMENTS,
      totalItemsCount: MOCK_ASSIGNMENTS.length,
    };
  },

  /**
   * Get assignment details by ID.
   */
  async getAssignmentDetails(id: string): Promise<Assignment> {
    await delay(MOCK_NETWORK_DELAY_MS);
    const assignment = MOCK_ASSIGNMENTS.find((a) => a.__identity === id);
    if (!assignment) {
      throw new Error(`Assignment not found: ${id}`);
    }
    return assignment;
  },

  /**
   * Search exchanges with optional filtering.
   */
  async searchExchanges(
    _config: SearchConfiguration = {}
  ): Promise<{ items: GameExchange[]; totalItemsCount: number }> {
    await delay(MOCK_NETWORK_DELAY_MS);
    return {
      items: MOCK_EXCHANGES,
      totalItemsCount: MOCK_EXCHANGES.length,
    };
  },

  /**
   * Search compensations with optional filtering.
   */
  async searchCompensations(
    _config: SearchConfiguration = {}
  ): Promise<{ items: CompensationRecord[]; totalItemsCount: number }> {
    await delay(MOCK_NETWORK_DELAY_MS);
    return {
      items: MOCK_COMPENSATIONS,
      totalItemsCount: MOCK_COMPENSATIONS.length,
    };
  },
};

export type MobileApiClient = typeof mobileApiClient;
