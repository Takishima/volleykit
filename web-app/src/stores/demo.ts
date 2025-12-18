import { create } from "zustand";
import type {
  Assignment,
  CompensationRecord,
  GameExchange,
  NominationList,
  PossibleNomination,
  PersonSearchResult,
} from "@/api/client";
import { addDays, addHours, subDays } from "date-fns";

// Mock player for roster display
export interface MockRosterPlayer {
  id: string;
  shirtNumber: number;
  displayName: string;
  licenseCategory?: string;
  isCaptain?: boolean;
  isLibero?: boolean;
}

// Mock nomination lists keyed by game ID, then by team type
export type MockNominationLists = Record<
  string,
  {
    home: NominationList;
    away: NominationList;
  }
>;

// Valid association codes for demo mode
// SV = Swiss Volley (national), SVRBA = Regional Basel, SVRZ = Regional Zurich
export type DemoAssociationCode = "SV" | "SVRBA" | "SVRZ";

interface DemoState {
  // Data arrays - populated when demo mode is enabled via useAuthStore
  assignments: Assignment[];
  compensations: CompensationRecord[];
  exchanges: GameExchange[];
  nominationLists: MockNominationLists;
  possiblePlayers: PossibleNomination[];
  scorers: PersonSearchResult[];

  // Current active association code for region-specific data
  activeAssociationCode: DemoAssociationCode | null;

  // Demo user's referee level for filtering exchanges
  // Level string (e.g., "N2") and gradation value (higher = more qualified)
  userRefereeLevel: string | null;
  userRefereeLevelGradationValue: number | null;

  // Data lifecycle actions
  initializeDemoData: (associationCode?: DemoAssociationCode) => void;
  clearDemoData: () => void;
  refreshData: () => void;
  setActiveAssociation: (associationCode: DemoAssociationCode) => void;

  // Demo mode operations (callers should verify isDemoMode from useAuthStore first)
  applyForExchange: (exchangeId: string) => void;
  withdrawFromExchange: (exchangeId: string) => void;
  addAssignmentToExchange: (assignmentId: string) => void;
  updateCompensation: (
    compensationId: string,
    data: { distanceInMetres?: number },
  ) => void;
}

type Weekday = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

const TRAVEL_EXPENSE_RATE_PER_KM = 0.7;

function calculateTravelExpenses(distanceInMetres: number): number {
  const distanceInKm = distanceInMetres / 1000;
  return Math.round(distanceInKm * TRAVEL_EXPENSE_RATE_PER_KM * 100) / 100;
}

function updateCompensationRecord(
  comp: CompensationRecord,
  compensationId: string,
  data: { distanceInMetres?: number },
): CompensationRecord {
  if (comp.__identity !== compensationId) return comp;
  if (!comp.convocationCompensation) return comp;

  const newDistance =
    data.distanceInMetres ?? comp.convocationCompensation.distanceInMetres;

  return {
    ...comp,
    convocationCompensation: {
      ...comp.convocationCompensation,
      distanceInMetres: newDistance,
      travelExpenses:
        newDistance !== undefined
          ? calculateTravelExpenses(newDistance)
          : comp.convocationCompensation.travelExpenses,
    },
  };
}

function getWeekday(date: Date): Weekday {
  const days = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ] as const satisfies readonly Weekday[];
  // getDay() always returns 0-6, non-null assertion is safe here
  return days[date.getDay()]!;
}

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

interface AddressParams {
  id: string;
  street?: string;
  houseNumber?: string;
  postalCode: string;
  city: string;
}

function createAddress({
  id,
  street,
  houseNumber,
  postalCode,
  city,
}: AddressParams) {
  const combinedAddress =
    street && houseNumber
      ? `${street} ${houseNumber}, ${postalCode} ${city}`
      : `${postalCode} ${city}`;

  return {
    __identity: id,
    ...(street && { street }),
    ...(houseNumber && { houseNumber }),
    postalCode,
    city,
    combinedAddress,
  };
}

// League categories available by association type
// SV (national): NLA, NLB (top leagues)
// Regional (SVRBA, SVRZ, etc.): 1L, 2L, 3L (regional leagues)
interface LeagueConfig {
  name: string;
  identifier: number;
}

const SV_LEAGUES: LeagueConfig[] = [
  { name: "NLA", identifier: 1 },
  { name: "NLB", identifier: 2 },
];

const REGIONAL_LEAGUES: LeagueConfig[] = [
  { name: "1L", identifier: 3 },
  { name: "2L", identifier: 4 },
  { name: "3L", identifier: 5 },
];

function getLeaguesForAssociation(
  associationCode: DemoAssociationCode,
): LeagueConfig[] {
  return associationCode === "SV" ? SV_LEAGUES : REGIONAL_LEAGUES;
}

function generateDummyData(associationCode: DemoAssociationCode = "SV") {
  const now = new Date();
  const leagues = getLeaguesForAssociation(associationCode);
  const isSV = associationCode === "SV";

  // Helper to get a league from the available leagues for this association
  const getLeague = (index: number): LeagueConfig =>
    leagues[index % leagues.length]!;

  const dummyAssignments: Assignment[] = [
    {
      __identity: "demo-assignment-1",
      refereeConvocationStatus: "active",
      refereePosition: "head-one",
      confirmationStatus: "confirmed",
      confirmationDate: subDays(now, 5).toISOString(),
      isOpenEntryInRefereeGameExchange: false,
      hasLastMessageToReferee: false,
      hasLinkedDoubleConvocation: false,
      refereeGame: {
        __identity: "demo-game-1",
        isGameInFuture: "1",
        game: {
          __identity: "demo-g-1",
          number: 382417,
          startingDateTime: addDays(now, 2).toISOString(),
          playingWeekday: getWeekday(addDays(now, 2)),
          encounter: {
            teamHome: {
              __identity: "team-1",
              name: isSV ? "VBC Zürich Lions" : "VBC Bern",
              identifier: 59591,
            },
            teamAway: {
              __identity: "team-2",
              name: isSV ? "Volley Luzern" : "VC Münsingen",
              identifier: 59592,
            },
          },
          hall: {
            __identity: "hall-1",
            name: isSV ? "Saalsporthalle Zürich" : "Sporthalle Wankdorf",
            primaryPostalAddress: createAddress({
              id: "addr-1",
              street: isSV ? "Hardturmstrasse" : "Papiermühlestrasse",
              houseNumber: isSV ? "154" : "71",
              postalCode: isSV ? "8005" : "3014",
              city: isSV ? "Zürich" : "Bern",
            }),
          },
          group: {
            name: "Quali",
            managingAssociationShortName: associationCode,
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: getLeague(0),
                gender: "m",
              },
            },
          },
        },
      },
    },
    {
      __identity: "demo-assignment-2",
      refereeConvocationStatus: "active",
      refereePosition: "linesman-one",
      confirmationStatus: "confirmed",
      confirmationDate: subDays(now, 3).toISOString(),
      isOpenEntryInRefereeGameExchange: false,
      hasLastMessageToReferee: true,
      hasLinkedDoubleConvocation: false,
      refereeGame: {
        __identity: "demo-game-2",
        isGameInFuture: "1",
        game: {
          __identity: "demo-g-2",
          number: 382418,
          startingDateTime: addHours(addDays(now, 0), 3).toISOString(),
          playingWeekday: getWeekday(now),
          encounter: {
            teamHome: {
              __identity: "team-3",
              name: isSV ? "Schönenwerd Smash" : "TV Muri",
              identifier: 59593,
            },
            teamAway: {
              __identity: "team-4",
              name: isSV ? "Traktor Basel" : "VBC Langenthal",
              identifier: 59594,
            },
          },
          hall: {
            __identity: "hall-2",
            name: isSV ? "Aarehalle Schönenwerd" : "Sporthalle Muri",
            primaryPostalAddress: createAddress({
              id: "addr-2",
              street: isSV ? "Aarauerstrasse" : "Klosterweg",
              houseNumber: isSV ? "50" : "8",
              postalCode: isSV ? "5012" : "5630",
              city: isSV ? "Schönenwerd" : "Muri AG",
            }),
          },
          group: {
            name: "Quali",
            managingAssociationShortName: associationCode,
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: getLeague(1),
                gender: "m",
              },
            },
          },
        },
      },
    },
    {
      __identity: "demo-assignment-3",
      refereeConvocationStatus: "active",
      refereePosition: "head-two",
      confirmationStatus: "pending",
      confirmationDate: null,
      isOpenEntryInRefereeGameExchange: false,
      hasLastMessageToReferee: false,
      hasLinkedDoubleConvocation: true,
      linkedDoubleConvocationGameNumberAndRefereePosition: "382420 / ARB 1",
      refereeGame: {
        __identity: "demo-game-3",
        isGameInFuture: "1",
        game: {
          __identity: "demo-g-3",
          number: 382419,
          startingDateTime: addDays(now, 5).toISOString(),
          playingWeekday: getWeekday(addDays(now, 5)),
          encounter: {
            teamHome: {
              __identity: "team-5",
              name: isSV ? "Volley Näfels" : "VBC Thun",
              identifier: 59595,
            },
            teamAway: {
              __identity: "team-6",
              name: isSV ? "Volero Zürich" : "VC Steffisburg",
              identifier: 59596,
            },
          },
          hall: {
            __identity: "hall-3",
            name: isSV ? "Lintharena Näfels" : "Lachenhalle Thun",
            primaryPostalAddress: createAddress({
              id: "addr-3",
              street: isSV ? "Sportplatzstrasse" : "Pestalozzistrasse",
              houseNumber: "1",
              postalCode: isSV ? "8752" : "3600",
              city: isSV ? "Näfels" : "Thun",
            }),
          },
          group: {
            name: "Quali",
            managingAssociationShortName: associationCode,
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: getLeague(0),
                gender: "f",
              },
            },
          },
        },
      },
    },
    {
      __identity: "demo-assignment-4",
      refereeConvocationStatus: "cancelled",
      refereePosition: "head-one",
      confirmationStatus: "confirmed",
      confirmationDate: subDays(now, 10).toISOString(),
      isOpenEntryInRefereeGameExchange: true,
      hasLastMessageToReferee: false,
      hasLinkedDoubleConvocation: false,
      refereeGame: {
        __identity: "demo-game-4",
        isGameInFuture: "1",
        game: {
          __identity: "demo-g-4",
          number: 382420,
          startingDateTime: addDays(now, 7).toISOString(),
          playingWeekday: getWeekday(addDays(now, 7)),
          encounter: {
            teamHome: {
              __identity: "team-7",
              name: isSV ? "VFM Therwil" : "VBC Solothurn",
              identifier: 59597,
            },
            teamAway: {
              __identity: "team-8",
              name: isSV ? "Genève Volley" : "VC Burgdorf",
              identifier: 59598,
            },
          },
          hall: {
            __identity: "hall-4",
            name: isSV ? "Sporthalle Kuspo Therwil" : "Stadtturnsaal Solothurn",
            primaryPostalAddress: createAddress({
              id: "addr-4",
              street: isSV ? "Im Letten" : "Rossmarktplatz",
              houseNumber: "2",
              postalCode: isSV ? "4106" : "4500",
              city: isSV ? "Therwil" : "Solothurn",
            }),
          },
          group: {
            name: "Quali",
            managingAssociationShortName: associationCode,
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: getLeague(1),
                gender: "f",
              },
            },
          },
        },
      },
    },
    {
      __identity: "demo-assignment-5",
      refereeConvocationStatus: "archived",
      refereePosition: "linesman-two",
      confirmationStatus: "confirmed",
      confirmationDate: subDays(now, 14).toISOString(),
      isOpenEntryInRefereeGameExchange: false,
      hasLastMessageToReferee: false,
      hasLinkedDoubleConvocation: false,
      refereeGame: {
        __identity: "demo-game-5",
        isGameInFuture: "0",
        game: {
          __identity: "demo-g-5",
          number: 382421,
          startingDateTime: subDays(now, 3).toISOString(),
          playingWeekday: getWeekday(subDays(now, 3)),
          encounter: {
            teamHome: {
              __identity: "team-9",
              name: isSV ? "Volley Köniz" : "VBC Aarau",
              identifier: 59599,
            },
            teamAway: {
              __identity: "team-10",
              name: isSV ? "VC Kanti" : "TV Zofingen",
              identifier: 59600,
            },
          },
          hall: {
            __identity: "hall-5",
            name: isSV ? "Weissenstein Halle" : "Schachen Halle Aarau",
            primaryPostalAddress: createAddress({
              id: "addr-5",
              street: isSV ? "Weissensteinstrasse" : "Schachenallee",
              houseNumber: isSV ? "80" : "29",
              postalCode: isSV ? "3008" : "5000",
              city: isSV ? "Bern" : "Aarau",
            }),
          },
          group: {
            name: "Quali",
            managingAssociationShortName: associationCode,
            phase: {
              name: "Phase 1",
              league: {
                // Use a different league index for variety
                leagueCategory: isSV ? getLeague(1) : getLeague(2),
                gender: "m",
              },
            },
          },
        },
      },
    },
  ];

  // Compensations: Only SV (national) allows flexible expense editing
  // Regional associations have fixed compensation rates
  const dummyCompensations: CompensationRecord[] = [
    {
      __identity: "demo-comp-1",
      refereeConvocationStatus: "active",
      refereePosition: "head-one",
      compensationDate: subDays(now, 7).toISOString(),
      refereeGame: {
        __identity: "demo-comp-game-1",
        isGameInFuture: "0",
        game: {
          __identity: "demo-cg-1",
          number: 382500,
          startingDateTime: subDays(now, 7).toISOString(),
          playingWeekday: getWeekday(subDays(now, 7)),
          encounter: {
            teamHome: {
              __identity: "team-11",
              name: isSV ? "VBC Zürich Lions" : "VBC Bern",
              identifier: 59601,
            },
            teamAway: {
              __identity: "team-12",
              name: isSV ? "Volley Luzern" : "VC Münsingen",
              identifier: 59602,
            },
          },
          hall: {
            __identity: "hall-c1",
            name: isSV ? "Saalsporthalle Zürich" : "Sporthalle Wankdorf",
            primaryPostalAddress: createAddress({
              id: "addr-c1",
              street: isSV ? "Hardturmstrasse" : "Papiermühlestrasse",
              houseNumber: isSV ? "154" : "71",
              postalCode: isSV ? "8005" : "3014",
              city: isSV ? "Zürich" : "Bern",
            }),
          },
          group: {
            name: "Quali",
            managingAssociationShortName: associationCode,
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: getLeague(0),
                gender: "m",
              },
            },
          },
        },
      },
      convocationCompensation: {
        __identity: "demo-cc-1",
        paymentDone: true,
        paymentValueDate: toDateString(subDays(now, 2)),
        gameCompensation: isSV ? 100 : 60,
        gameCompensationFormatted: isSV ? "100.00" : "60.00",
        travelExpenses: 33.6,
        travelExpensesFormatted: "33.60",
        distanceInMetres: 48000,
        distanceFormatted: "48.0",
        costFormatted: isSV ? "133.60" : "93.60",
        transportationMode: "car",
        hasFlexibleGameCompensations: false,
        hasFlexibleTravelExpenses: isSV,
        hasFlexibleOvernightStayExpenses: false,
        hasFlexibleCateringExpenses: false,
        overnightStayExpensesFormatted: "0.00",
        cateringExpensesFormatted: "0.00",
      },
    },
    {
      __identity: "demo-comp-2",
      refereeConvocationStatus: "active",
      refereePosition: "linesman-one",
      compensationDate: subDays(now, 14).toISOString(),
      refereeGame: {
        __identity: "demo-comp-game-2",
        isGameInFuture: "0",
        game: {
          __identity: "demo-cg-2",
          number: 382501,
          startingDateTime: subDays(now, 14).toISOString(),
          playingWeekday: getWeekday(subDays(now, 14)),
          encounter: {
            teamHome: {
              __identity: "team-13",
              name: isSV ? "Schönenwerd Smash" : "TV Muri",
              identifier: 59603,
            },
            teamAway: {
              __identity: "team-14",
              name: isSV ? "Traktor Basel" : "VBC Langenthal",
              identifier: 59604,
            },
          },
          hall: {
            __identity: "hall-c2",
            name: isSV ? "Aarehalle Schönenwerd" : "Sporthalle Muri",
            primaryPostalAddress: createAddress({
              id: "addr-c2",
              street: isSV ? "Aarauerstrasse" : "Klosterweg",
              houseNumber: isSV ? "50" : "8",
              postalCode: isSV ? "5012" : "5630",
              city: isSV ? "Schönenwerd" : "Muri AG",
            }),
          },
          group: {
            name: "Quali",
            managingAssociationShortName: associationCode,
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: getLeague(1),
                gender: "m",
              },
            },
          },
        },
      },
      convocationCompensation: {
        __identity: "demo-cc-2",
        paymentDone: false,
        gameCompensation: isSV ? 60 : 40,
        gameCompensationFormatted: isSV ? "60.00" : "40.00",
        travelExpenses: 24.5,
        travelExpensesFormatted: "24.50",
        distanceInMetres: 35000,
        distanceFormatted: "35.0",
        costFormatted: isSV ? "84.50" : "64.50",
        transportationMode: "car",
        hasFlexibleGameCompensations: false,
        hasFlexibleTravelExpenses: isSV,
        hasFlexibleOvernightStayExpenses: false,
        hasFlexibleCateringExpenses: false,
        overnightStayExpensesFormatted: "0.00",
        cateringExpensesFormatted: "0.00",
      },
    },
    {
      __identity: "demo-comp-3",
      refereeConvocationStatus: "active",
      refereePosition: "head-two",
      compensationDate: subDays(now, 21).toISOString(),
      refereeGame: {
        __identity: "demo-comp-game-3",
        isGameInFuture: "0",
        game: {
          __identity: "demo-cg-3",
          number: 382502,
          startingDateTime: subDays(now, 21).toISOString(),
          playingWeekday: getWeekday(subDays(now, 21)),
          encounter: {
            teamHome: {
              __identity: "team-15",
              name: isSV ? "Volley Näfels" : "VBC Thun",
              identifier: 59605,
            },
            teamAway: {
              __identity: "team-16",
              name: isSV ? "Volero Zürich" : "VC Steffisburg",
              identifier: 59606,
            },
          },
          hall: {
            __identity: "hall-c3",
            name: isSV ? "Lintharena Näfels" : "Lachenhalle Thun",
            primaryPostalAddress: createAddress({
              id: "addr-c3",
              street: isSV ? "Sportplatzstrasse" : "Pestalozzistrasse",
              houseNumber: "1",
              postalCode: isSV ? "8752" : "3600",
              city: isSV ? "Näfels" : "Thun",
            }),
          },
          group: {
            name: "Quali",
            managingAssociationShortName: associationCode,
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: getLeague(0),
                gender: "f",
              },
            },
          },
        },
      },
      convocationCompensation: {
        __identity: "demo-cc-3",
        paymentDone: true,
        paymentValueDate: toDateString(subDays(now, 14)),
        gameCompensation: isSV ? 80 : 50,
        gameCompensationFormatted: isSV ? "80.00" : "50.00",
        travelExpenses: 43.4,
        travelExpensesFormatted: "43.40",
        distanceInMetres: 62000,
        distanceFormatted: "62.0",
        costFormatted: isSV ? "123.40" : "93.40",
        transportationMode: "car",
        hasFlexibleGameCompensations: false,
        hasFlexibleTravelExpenses: isSV,
        hasFlexibleOvernightStayExpenses: false,
        hasFlexibleCateringExpenses: false,
        overnightStayExpensesFormatted: "0.00",
        cateringExpensesFormatted: "0.00",
      },
    },
    {
      __identity: "demo-comp-4",
      refereeConvocationStatus: "active",
      refereePosition: "head-one",
      compensationDate: subDays(now, 5).toISOString(),
      refereeGame: {
        __identity: "demo-comp-game-4",
        isGameInFuture: "0",
        game: {
          __identity: "demo-cg-4",
          number: 382503,
          startingDateTime: subDays(now, 5).toISOString(),
          playingWeekday: getWeekday(subDays(now, 5)),
          encounter: {
            teamHome: {
              __identity: "team-17",
              name: isSV ? "VFM Therwil" : "VBC Solothurn",
              identifier: 59607,
            },
            teamAway: {
              __identity: "team-18",
              name: isSV ? "Genève Volley" : "VC Burgdorf",
              identifier: 59608,
            },
          },
          hall: {
            __identity: "hall-c4",
            name: isSV ? "Sporthalle Kuspo Therwil" : "Stadtturnsaal Solothurn",
            primaryPostalAddress: createAddress({
              id: "addr-c4",
              street: isSV ? "Im Letten" : "Rossmarktplatz",
              houseNumber: "2",
              postalCode: isSV ? "4106" : "4500",
              city: isSV ? "Therwil" : "Solothurn",
            }),
          },
          group: {
            name: "Quali",
            managingAssociationShortName: associationCode,
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: getLeague(1),
                gender: "f",
              },
            },
          },
        },
      },
      convocationCompensation: {
        __identity: "demo-cc-4",
        paymentDone: false,
        gameCompensation: isSV ? 100 : 60,
        gameCompensationFormatted: isSV ? "100.00" : "60.00",
        travelExpenses: 62.3,
        travelExpensesFormatted: "62.30",
        distanceInMetres: 89000,
        distanceFormatted: "89.0",
        costFormatted: isSV ? "162.30" : "122.30",
        transportationMode: "car",
        hasFlexibleGameCompensations: false,
        hasFlexibleTravelExpenses: isSV,
        hasFlexibleOvernightStayExpenses: false,
        hasFlexibleCateringExpenses: false,
        overnightStayExpensesFormatted: "0.00",
        cateringExpensesFormatted: "0.00",
      },
    },
    {
      __identity: "demo-comp-5",
      refereeConvocationStatus: "active",
      refereePosition: "linesman-two",
      compensationDate: subDays(now, 28).toISOString(),
      refereeGame: {
        __identity: "demo-comp-game-5",
        isGameInFuture: "0",
        game: {
          __identity: "demo-cg-5",
          number: 382504,
          startingDateTime: subDays(now, 28).toISOString(),
          playingWeekday: getWeekday(subDays(now, 28)),
          encounter: {
            teamHome: {
              __identity: "team-19",
              name: isSV ? "Volley Köniz" : "VBC Aarau",
              identifier: 59609,
            },
            teamAway: {
              __identity: "team-20",
              name: isSV ? "VC Kanti" : "TV Zofingen",
              identifier: 59610,
            },
          },
          hall: {
            __identity: "hall-c5",
            name: isSV ? "Weissenstein Halle" : "Schachen Halle Aarau",
            primaryPostalAddress: createAddress({
              id: "addr-c5",
              street: isSV ? "Weissensteinstrasse" : "Schachenallee",
              houseNumber: isSV ? "80" : "29",
              postalCode: isSV ? "3008" : "5000",
              city: isSV ? "Bern" : "Aarau",
            }),
          },
          group: {
            name: "Quali",
            managingAssociationShortName: associationCode,
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: isSV ? getLeague(1) : getLeague(2),
                gender: "m",
              },
            },
          },
        },
      },
      convocationCompensation: {
        __identity: "demo-cc-5",
        paymentDone: true,
        paymentValueDate: toDateString(subDays(now, 21)),
        gameCompensation: isSV ? 50 : 30,
        gameCompensationFormatted: isSV ? "50.00" : "30.00",
        travelExpenses: 16.8,
        travelExpensesFormatted: "16.80",
        distanceInMetres: 24000,
        distanceFormatted: "24.0",
        costFormatted: isSV ? "66.80" : "46.80",
        transportationMode: "train",
        hasFlexibleGameCompensations: false,
        hasFlexibleTravelExpenses: isSV,
        hasFlexibleOvernightStayExpenses: false,
        hasFlexibleCateringExpenses: false,
        overnightStayExpensesFormatted: "0.00",
        cateringExpensesFormatted: "0.00",
      },
    },
  ];

  const dummyExchanges: GameExchange[] = [
    {
      __identity: "demo-exchange-1",
      status: "open",
      submittedAt: subDays(now, 2).toISOString(),
      submittingType: "referee",
      refereePosition: "head-one",
      requiredRefereeLevel: "N3",
      requiredRefereeLevelGradationValue: "1",
      submittedByPerson: {
        __identity: "demo-person-1",
        firstName: "Max",
        lastName: "Müller",
        displayName: "Max Müller",
      },
      refereeGame: {
        __identity: "demo-ex-game-1",
        isGameInFuture: "1",
        activeFirstHeadRefereeName: "Max Müller",
        activeSecondHeadRefereeName: "Lisa Weber",
        game: {
          __identity: "demo-exg-1",
          number: 382600,
          startingDateTime: addDays(now, 4).toISOString(),
          playingWeekday: getWeekday(addDays(now, 4)),
          encounter: {
            teamHome: {
              __identity: "team-21",
              name: isSV ? "VBC Zürich Lions" : "VBC Bern",
              identifier: 59611,
            },
            teamAway: {
              __identity: "team-22",
              name: isSV ? "Volley Luzern" : "VC Münsingen",
              identifier: 59612,
            },
          },
          hall: {
            __identity: "hall-6",
            name: isSV ? "Saalsporthalle Zürich" : "Sporthalle Wankdorf",
            primaryPostalAddress: createAddress({
              id: "addr-e1",
              street: isSV ? "Hardturmstrasse" : "Papiermühlestrasse",
              houseNumber: isSV ? "154" : "71",
              postalCode: isSV ? "8005" : "3014",
              city: isSV ? "Zürich" : "Bern",
            }),
          },
          group: {
            name: "Quali",
            managingAssociationShortName: associationCode,
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: getLeague(0),
                gender: "m",
              },
            },
          },
        },
      },
    },
    {
      __identity: "demo-exchange-2",
      status: "open",
      submittedAt: subDays(now, 1).toISOString(),
      submittingType: "referee",
      refereePosition: "linesman-one",
      requiredRefereeLevel: "N2",
      requiredRefereeLevelGradationValue: "2",
      submittedByPerson: {
        __identity: "demo-person-2",
        firstName: "Anna",
        lastName: "Schmidt",
        displayName: "Anna Schmidt",
      },
      refereeGame: {
        __identity: "demo-ex-game-2",
        isGameInFuture: "1",
        activeFirstHeadRefereeName: "Thomas Meier",
        activeSecondHeadRefereeName: "Sandra Keller",
        activeFirstLinesmanRefereeName: "Anna Schmidt",
        game: {
          __identity: "demo-exg-2",
          number: 382601,
          startingDateTime: addDays(now, 6).toISOString(),
          playingWeekday: getWeekday(addDays(now, 6)),
          encounter: {
            teamHome: {
              __identity: "team-23",
              name: isSV ? "Schönenwerd Smash" : "TV Muri",
              identifier: 59613,
            },
            teamAway: {
              __identity: "team-24",
              name: isSV ? "Traktor Basel" : "VBC Langenthal",
              identifier: 59614,
            },
          },
          hall: {
            __identity: "hall-7",
            name: isSV ? "Aarehalle Schönenwerd" : "Sporthalle Muri",
            primaryPostalAddress: createAddress({
              id: "addr-e2",
              street: isSV ? "Aarauerstrasse" : "Klosterweg",
              houseNumber: isSV ? "50" : "8",
              postalCode: isSV ? "5012" : "5630",
              city: isSV ? "Schönenwerd" : "Muri AG",
            }),
          },
          group: {
            name: "Quali",
            managingAssociationShortName: associationCode,
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: getLeague(1),
                gender: "m",
              },
            },
          },
        },
      },
    },
    {
      __identity: "demo-exchange-3",
      status: "applied",
      submittedAt: subDays(now, 5).toISOString(),
      submittingType: "referee",
      refereePosition: "head-two",
      requiredRefereeLevel: "N2",
      requiredRefereeLevelGradationValue: "1",
      submittedByPerson: {
        __identity: "demo-person-3",
        firstName: "Peter",
        lastName: "Weber",
        displayName: "Peter Weber",
      },
      appliedBy: {
        indoorReferee: {
          person: {
            __identity: "demo-me",
            firstName: "Demo",
            lastName: "User",
            displayName: "Demo User",
          },
        },
      },
      appliedAt: subDays(now, 3).toISOString(),
      refereeGame: {
        __identity: "demo-ex-game-3",
        isGameInFuture: "1",
        activeFirstHeadRefereeName: "Laura Brunner",
        activeSecondHeadRefereeName: "Peter Weber",
        game: {
          __identity: "demo-exg-3",
          number: 382602,
          startingDateTime: addDays(now, 8).toISOString(),
          playingWeekday: getWeekday(addDays(now, 8)),
          encounter: {
            teamHome: {
              __identity: "team-25",
              name: isSV ? "Volley Näfels" : "VBC Thun",
              identifier: 59615,
            },
            teamAway: {
              __identity: "team-26",
              name: isSV ? "Volero Zürich" : "VC Steffisburg",
              identifier: 59616,
            },
          },
          hall: {
            __identity: "hall-8",
            name: isSV ? "Lintharena Näfels" : "Lachenhalle Thun",
            primaryPostalAddress: createAddress({
              id: "addr-e3",
              street: isSV ? "Sportplatzstrasse" : "Pestalozzistrasse",
              houseNumber: "1",
              postalCode: isSV ? "8752" : "3600",
              city: isSV ? "Näfels" : "Thun",
            }),
          },
          group: {
            name: "Quali",
            managingAssociationShortName: associationCode,
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: getLeague(0),
                gender: "f",
              },
            },
          },
        },
      },
    },
    {
      __identity: "demo-exchange-4",
      status: "open",
      submittedAt: subDays(now, 3).toISOString(),
      submittingType: "admin",
      refereePosition: "head-one",
      requiredRefereeLevel: isSV ? "N1" : "N2",
      requiredRefereeLevelGradationValue: "1",
      submittedByPerson: {
        __identity: "demo-person-4",
        firstName: "Sara",
        lastName: "Keller",
        displayName: "Sara Keller",
      },
      refereeGame: {
        __identity: "demo-ex-game-4",
        isGameInFuture: "1",
        activeFirstHeadRefereeName: "",
        activeSecondHeadRefereeName: "Julia Hofer",
        game: {
          __identity: "demo-exg-4",
          number: 382603,
          startingDateTime: addDays(now, 10).toISOString(),
          playingWeekday: getWeekday(addDays(now, 10)),
          encounter: {
            teamHome: {
              __identity: "team-27",
              name: isSV ? "VFM Therwil" : "VBC Solothurn",
              identifier: 59617,
            },
            teamAway: {
              __identity: "team-28",
              name: isSV ? "Genève Volley" : "VC Burgdorf",
              identifier: 59618,
            },
          },
          hall: {
            __identity: "hall-9",
            name: isSV ? "Sporthalle Kuspo Therwil" : "Stadtturnsaal Solothurn",
            primaryPostalAddress: createAddress({
              id: "addr-e4",
              street: isSV ? "Im Letten" : "Rossmarktplatz",
              houseNumber: "2",
              postalCode: isSV ? "4106" : "4500",
              city: isSV ? "Therwil" : "Solothurn",
            }),
          },
          group: {
            name: "Quali",
            managingAssociationShortName: associationCode,
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: getLeague(1),
                gender: "f",
              },
            },
          },
        },
      },
    },
    {
      __identity: "demo-exchange-5",
      status: "closed",
      submittedAt: subDays(now, 10).toISOString(),
      submittingType: "referee",
      refereePosition: "linesman-two",
      requiredRefereeLevel: "N3",
      requiredRefereeLevelGradationValue: "3",
      submittedByPerson: {
        __identity: "demo-person-5",
        firstName: "Thomas",
        lastName: "Huber",
        displayName: "Thomas Huber",
      },
      refereeGame: {
        __identity: "demo-ex-game-5",
        isGameInFuture: "0",
        activeFirstHeadRefereeName: "Michael Fischer",
        activeSecondHeadRefereeName: "Nina Baumann",
        activeSecondLinesmanRefereeName: "Demo User",
        game: {
          __identity: "demo-exg-5",
          number: 382604,
          startingDateTime: subDays(now, 2).toISOString(),
          playingWeekday: getWeekday(subDays(now, 2)),
          encounter: {
            teamHome: {
              __identity: "team-29",
              name: isSV ? "Volley Köniz" : "VBC Aarau",
              identifier: 59619,
            },
            teamAway: {
              __identity: "team-30",
              name: isSV ? "VC Kanti" : "TV Zofingen",
              identifier: 59620,
            },
          },
          hall: {
            __identity: "hall-10",
            name: isSV ? "Weissenstein Halle" : "Schachen Halle Aarau",
            primaryPostalAddress: createAddress({
              id: "addr-e5",
              street: isSV ? "Weissensteinstrasse" : "Schachenallee",
              houseNumber: isSV ? "80" : "29",
              postalCode: isSV ? "3008" : "5000",
              city: isSV ? "Bern" : "Aarau",
            }),
          },
          group: {
            name: "Quali",
            managingAssociationShortName: associationCode,
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: isSV ? getLeague(1) : getLeague(2),
                gender: "m",
              },
            },
          },
        },
      },
    },
  ];

  const dummyPossiblePlayers: PossibleNomination[] = [
    {
      __identity: "demo-possible-1",
      indoorPlayer: {
        __identity: "demo-player-1",
        person: {
          __identity: "demo-person-p1",
          displayName: "Max Müller",
          firstName: "Max",
          lastName: "Müller",
        },
      },
      licenseCategory: "SEN",
      isAlreadyNominated: false,
    },
    {
      __identity: "demo-possible-2",
      indoorPlayer: {
        __identity: "demo-player-2",
        person: {
          __identity: "demo-person-p2",
          displayName: "Anna Schmidt",
          firstName: "Anna",
          lastName: "Schmidt",
        },
      },
      licenseCategory: "SEN",
      isAlreadyNominated: false,
    },
    {
      __identity: "demo-possible-3",
      indoorPlayer: {
        __identity: "demo-player-3",
        person: {
          __identity: "demo-person-p3",
          displayName: "Thomas Weber",
          firstName: "Thomas",
          lastName: "Weber",
        },
      },
      licenseCategory: "JUN",
      isAlreadyNominated: false,
    },
    {
      __identity: "demo-possible-4",
      indoorPlayer: {
        __identity: "demo-player-4",
        person: {
          __identity: "demo-person-p4",
          displayName: "Laura Keller",
          firstName: "Laura",
          lastName: "Keller",
        },
      },
      licenseCategory: "SEN",
      isAlreadyNominated: true,
    },
    {
      __identity: "demo-possible-5",
      indoorPlayer: {
        __identity: "demo-player-5",
        person: {
          __identity: "demo-person-p5",
          displayName: "Marco Rossi",
          firstName: "Marco",
          lastName: "Rossi",
        },
      },
      licenseCategory: "JUN",
      isAlreadyNominated: false,
    },
    {
      __identity: "demo-possible-6",
      indoorPlayer: {
        __identity: "demo-player-6",
        person: {
          __identity: "demo-person-p6",
          displayName: "Sophie Dubois",
          firstName: "Sophie",
          lastName: "Dubois",
        },
      },
      licenseCategory: "SEN",
      isAlreadyNominated: false,
    },
    {
      __identity: "demo-possible-7",
      indoorPlayer: {
        __identity: "demo-player-7",
        person: {
          __identity: "demo-person-p7",
          displayName: "Luca Bernasconi",
          firstName: "Luca",
          lastName: "Bernasconi",
        },
      },
      licenseCategory: "JUN",
      isAlreadyNominated: false,
    },
    {
      __identity: "demo-possible-8",
      indoorPlayer: {
        __identity: "demo-player-8",
        person: {
          __identity: "demo-person-p8",
          displayName: "Nina Hofmann",
          firstName: "Nina",
          lastName: "Hofmann",
        },
      },
      licenseCategory: "SEN",
      isAlreadyNominated: false,
    },
  ];

  const dummyScorers: PersonSearchResult[] = [
    {
      __identity: "d1111111-1111-4111-a111-111111111111",
      firstName: "Hans",
      lastName: "Müller",
      displayName: "Hans Müller",
      associationId: 12345,
      birthday: "1985-03-15T00:00:00+00:00",
      gender: "m",
    },
    {
      __identity: "d2222222-2222-4222-a222-222222222222",
      firstName: "Maria",
      lastName: "Müller",
      displayName: "Maria Müller",
      associationId: 12346,
      birthday: "1990-07-22T00:00:00+00:00",
      gender: "f",
    },
    {
      __identity: "d3333333-3333-4333-a333-333333333333",
      firstName: "Peter",
      lastName: "Schmidt",
      displayName: "Peter Schmidt",
      associationId: 23456,
      birthday: "1978-11-08T00:00:00+00:00",
      gender: "m",
    },
    {
      __identity: "d4444444-4444-4444-a444-444444444444",
      firstName: "Anna",
      lastName: "Weber",
      displayName: "Anna Weber",
      associationId: 34567,
      birthday: "1995-01-30T00:00:00+00:00",
      gender: "f",
    },
    {
      __identity: "d5555555-5555-4555-a555-555555555555",
      firstName: "Thomas",
      lastName: "Brunner",
      displayName: "Thomas Brunner",
      associationId: 45678,
      birthday: "1982-09-12T00:00:00+00:00",
      gender: "m",
    },
    {
      __identity: "d6666666-6666-4666-a666-666666666666",
      firstName: "Sandra",
      lastName: "Keller",
      displayName: "Sandra Keller",
      associationId: 56789,
      birthday: "1988-05-25T00:00:00+00:00",
      gender: "f",
    },
    {
      __identity: "d7777777-7777-4777-a777-777777777777",
      firstName: "Marco",
      lastName: "Meier",
      displayName: "Marco Meier",
      associationId: 67890,
      birthday: "1992-12-03T00:00:00+00:00",
      gender: "m",
    },
    {
      __identity: "d8888888-8888-4888-a888-888888888888",
      firstName: "Lisa",
      lastName: "Fischer",
      displayName: "Lisa Fischer",
      associationId: 78901,
      birthday: "1985-08-18T00:00:00+00:00",
      gender: "f",
    },
    {
      __identity: "d9999999-9999-4999-a999-999999999999",
      firstName: "Stefan",
      lastName: "Huber",
      displayName: "Stefan Huber",
      associationId: 89012,
      birthday: "1975-04-07T00:00:00+00:00",
      gender: "m",
    },
    {
      __identity: "daaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      firstName: "Nicole",
      lastName: "Steiner",
      displayName: "Nicole Steiner",
      associationId: 90123,
      birthday: "1998-02-14T00:00:00+00:00",
      gender: "f",
    },
  ];

  return {
    assignments: dummyAssignments,
    compensations: dummyCompensations,
    exchanges: dummyExchanges,
    possiblePlayers: dummyPossiblePlayers,
    scorers: dummyScorers,
  };
}

function generateMockNominationLists(): MockNominationLists {
  // Generate mock nomination lists for the first 3 demo games
  // These correspond to demo-g-1, demo-g-2, demo-g-3 from the assignments

  const nominationLists: MockNominationLists = {
    "demo-g-1": {
      home: {
        __identity: "demo-nomlist-home-1",
        game: { __identity: "demo-g-1" },
        team: { __identity: "team-1", displayName: "VBC Zürich Lions" },
        closed: false,
        isClosedForTeam: false,
        indoorPlayerNominations: [
          {
            __identity: "demo-nom-1-1",
            shirtNumber: 1,
            isCaptain: true,
            isLibero: false,
            indoorPlayer: {
              __identity: "demo-player-1-1",
              person: {
                __identity: "demo-person-1-1",
                firstName: "Marco",
                lastName: "Meier",
                displayName: "Marco Meier",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
          {
            __identity: "demo-nom-1-2",
            shirtNumber: 7,
            isCaptain: false,
            isLibero: false,
            indoorPlayer: {
              __identity: "demo-player-1-2",
              person: {
                __identity: "demo-person-1-2",
                firstName: "Lukas",
                lastName: "Schneider",
                displayName: "Lukas Schneider",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
          {
            __identity: "demo-nom-1-3",
            shirtNumber: 12,
            isCaptain: false,
            isLibero: true,
            indoorPlayer: {
              __identity: "demo-player-1-3",
              person: {
                __identity: "demo-person-1-3",
                firstName: "Noah",
                lastName: "Weber",
                displayName: "Noah Weber",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-jun",
              shortName: "JUN",
            },
          },
          {
            __identity: "demo-nom-1-4",
            shirtNumber: 5,
            isCaptain: false,
            isLibero: false,
            indoorPlayer: {
              __identity: "demo-player-1-4",
              person: {
                __identity: "demo-person-1-4",
                firstName: "Felix",
                lastName: "Keller",
                displayName: "Felix Keller",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
          {
            __identity: "demo-nom-1-5",
            shirtNumber: 9,
            isCaptain: false,
            isLibero: false,
            indoorPlayer: {
              __identity: "demo-player-1-5",
              person: {
                __identity: "demo-person-1-5",
                firstName: "Tim",
                lastName: "Fischer",
                displayName: "Tim Fischer",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
          {
            __identity: "demo-nom-1-6",
            shirtNumber: 14,
            isCaptain: false,
            isLibero: false,
            indoorPlayer: {
              __identity: "demo-player-1-6",
              person: {
                __identity: "demo-person-1-6",
                firstName: "Jan",
                lastName: "Brunner",
                displayName: "Jan Brunner",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
        ],
      },
      away: {
        __identity: "demo-nomlist-away-1",
        game: { __identity: "demo-g-1" },
        team: { __identity: "team-2", displayName: "Volley Luzern" },
        closed: false,
        isClosedForTeam: false,
        indoorPlayerNominations: [
          {
            __identity: "demo-nom-2-1",
            shirtNumber: 3,
            isCaptain: true,
            isLibero: false,
            indoorPlayer: {
              __identity: "demo-player-2-1",
              person: {
                __identity: "demo-person-2-1",
                firstName: "David",
                lastName: "Steiner",
                displayName: "David Steiner",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
          {
            __identity: "demo-nom-2-2",
            shirtNumber: 8,
            isCaptain: false,
            isLibero: false,
            indoorPlayer: {
              __identity: "demo-player-2-2",
              person: {
                __identity: "demo-person-2-2",
                firstName: "Simon",
                lastName: "Frei",
                displayName: "Simon Frei",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
          {
            __identity: "demo-nom-2-3",
            shirtNumber: 11,
            isCaptain: false,
            isLibero: true,
            indoorPlayer: {
              __identity: "demo-player-2-3",
              person: {
                __identity: "demo-person-2-3",
                firstName: "Luca",
                lastName: "Gerber",
                displayName: "Luca Gerber",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-jun",
              shortName: "JUN",
            },
          },
          {
            __identity: "demo-nom-2-4",
            shirtNumber: 6,
            isCaptain: false,
            isLibero: false,
            indoorPlayer: {
              __identity: "demo-player-2-4",
              person: {
                __identity: "demo-person-2-4",
                firstName: "Yannick",
                lastName: "Hofer",
                displayName: "Yannick Hofer",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
          {
            __identity: "demo-nom-2-5",
            shirtNumber: 10,
            isCaptain: false,
            isLibero: false,
            indoorPlayer: {
              __identity: "demo-player-2-5",
              person: {
                __identity: "demo-person-2-5",
                firstName: "Nico",
                lastName: "Baumann",
                displayName: "Nico Baumann",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
        ],
      },
    },
    "demo-g-2": {
      home: {
        __identity: "demo-nomlist-home-2",
        game: { __identity: "demo-g-2" },
        team: { __identity: "team-3", displayName: "Schönenwerd Smash" },
        closed: false,
        isClosedForTeam: false,
        indoorPlayerNominations: [
          {
            __identity: "demo-nom-3-1",
            shirtNumber: 2,
            isCaptain: true,
            isLibero: false,
            indoorPlayer: {
              __identity: "demo-player-3-1",
              person: {
                __identity: "demo-person-3-1",
                firstName: "Raphael",
                lastName: "Widmer",
                displayName: "Raphael Widmer",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
          {
            __identity: "demo-nom-3-2",
            shirtNumber: 15,
            isCaptain: false,
            isLibero: true,
            indoorPlayer: {
              __identity: "demo-player-3-2",
              person: {
                __identity: "demo-person-3-2",
                firstName: "Kevin",
                lastName: "Bieri",
                displayName: "Kevin Bieri",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
          {
            __identity: "demo-nom-3-3",
            shirtNumber: 4,
            isCaptain: false,
            isLibero: false,
            indoorPlayer: {
              __identity: "demo-player-3-3",
              person: {
                __identity: "demo-person-3-3",
                firstName: "Patrick",
                lastName: "Moser",
                displayName: "Patrick Moser",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
        ],
      },
      away: {
        __identity: "demo-nomlist-away-2",
        game: { __identity: "demo-g-2" },
        team: { __identity: "team-4", displayName: "Traktor Basel" },
        closed: false,
        isClosedForTeam: false,
        indoorPlayerNominations: [
          {
            __identity: "demo-nom-4-1",
            shirtNumber: 1,
            isCaptain: false,
            isLibero: false,
            indoorPlayer: {
              __identity: "demo-player-4-1",
              person: {
                __identity: "demo-person-4-1",
                firstName: "Benjamin",
                lastName: "Koch",
                displayName: "Benjamin Koch",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
          {
            __identity: "demo-nom-4-2",
            shirtNumber: 13,
            isCaptain: true,
            isLibero: false,
            indoorPlayer: {
              __identity: "demo-player-4-2",
              person: {
                __identity: "demo-person-4-2",
                firstName: "Michael",
                lastName: "Lang",
                displayName: "Michael Lang",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
          {
            __identity: "demo-nom-4-3",
            shirtNumber: 17,
            isCaptain: false,
            isLibero: true,
            indoorPlayer: {
              __identity: "demo-player-4-3",
              person: {
                __identity: "demo-person-4-3",
                firstName: "Julian",
                lastName: "Roth",
                displayName: "Julian Roth",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-jun",
              shortName: "JUN",
            },
          },
        ],
      },
    },
    "demo-g-3": {
      home: {
        __identity: "demo-nomlist-home-3",
        game: { __identity: "demo-g-3" },
        team: { __identity: "team-5", displayName: "Volley Näfels" },
        closed: false,
        isClosedForTeam: false,
        indoorPlayerNominations: [
          {
            __identity: "demo-nom-5-1",
            shirtNumber: 6,
            isCaptain: true,
            isLibero: false,
            indoorPlayer: {
              __identity: "demo-player-5-1",
              person: {
                __identity: "demo-person-5-1",
                firstName: "Anna",
                lastName: "Huber",
                displayName: "Anna Huber",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
          {
            __identity: "demo-nom-5-2",
            shirtNumber: 10,
            isCaptain: false,
            isLibero: true,
            indoorPlayer: {
              __identity: "demo-player-5-2",
              person: {
                __identity: "demo-person-5-2",
                firstName: "Lisa",
                lastName: "Meyer",
                displayName: "Lisa Meyer",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
          {
            __identity: "demo-nom-5-3",
            shirtNumber: 8,
            isCaptain: false,
            isLibero: false,
            indoorPlayer: {
              __identity: "demo-player-5-3",
              person: {
                __identity: "demo-person-5-3",
                firstName: "Sara",
                lastName: "Schmid",
                displayName: "Sara Schmid",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-jun",
              shortName: "JUN",
            },
          },
        ],
      },
      away: {
        __identity: "demo-nomlist-away-3",
        game: { __identity: "demo-g-3" },
        team: { __identity: "team-6", displayName: "Volero Zürich" },
        closed: false,
        isClosedForTeam: false,
        indoorPlayerNominations: [
          {
            __identity: "demo-nom-6-1",
            shirtNumber: 4,
            isCaptain: true,
            isLibero: false,
            indoorPlayer: {
              __identity: "demo-player-6-1",
              person: {
                __identity: "demo-person-6-1",
                firstName: "Elena",
                lastName: "Keller",
                displayName: "Elena Keller",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
          {
            __identity: "demo-nom-6-2",
            shirtNumber: 7,
            isCaptain: false,
            isLibero: false,
            indoorPlayer: {
              __identity: "demo-player-6-2",
              person: {
                __identity: "demo-person-6-2",
                firstName: "Julia",
                lastName: "Lehmann",
                displayName: "Julia Lehmann",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
          {
            __identity: "demo-nom-6-3",
            shirtNumber: 12,
            isCaptain: false,
            isLibero: true,
            indoorPlayer: {
              __identity: "demo-player-6-3",
              person: {
                __identity: "demo-person-6-3",
                firstName: "Nina",
                lastName: "Zimmermann",
                displayName: "Nina Zimmermann",
              },
            },
            indoorPlayerLicenseCategory: {
              __identity: "lic-sen",
              shortName: "SEN",
            },
          },
        ],
      },
    },
  };

  return nominationLists;
}

// Demo user referee level configuration
// Gradation scale: N1=1 (highest/most qualified), N2=2, N3=3 (lowest)
// Lower gradation value = higher qualification level
// N2 referee (gradation 2) can officiate N2+ and N3+ games, but not N1+
const DEMO_USER_REFEREE_LEVEL = "N2";
const DEMO_USER_REFEREE_LEVEL_GRADATION_VALUE = 2;

export const useDemoStore = create<DemoState>()((set, get) => ({
  assignments: [],
  compensations: [],
  exchanges: [],
  nominationLists: {},
  possiblePlayers: [],
  scorers: [],
  activeAssociationCode: null,
  userRefereeLevel: null,
  userRefereeLevelGradationValue: null,

  initializeDemoData: (associationCode: DemoAssociationCode = "SV") => {
    const data = generateDummyData(associationCode);
    set({
      assignments: data.assignments,
      compensations: data.compensations,
      exchanges: data.exchanges,
      nominationLists: generateMockNominationLists(),
      possiblePlayers: data.possiblePlayers,
      scorers: data.scorers,
      activeAssociationCode: associationCode,
      userRefereeLevel: DEMO_USER_REFEREE_LEVEL,
      userRefereeLevelGradationValue: DEMO_USER_REFEREE_LEVEL_GRADATION_VALUE,
    });
  },

  clearDemoData: () =>
    set({
      assignments: [],
      compensations: [],
      exchanges: [],
      nominationLists: {},
      possiblePlayers: [],
      scorers: [],
      activeAssociationCode: null,
      userRefereeLevel: null,
      userRefereeLevelGradationValue: null,
    }),

  refreshData: () =>
    set(() => {
      const currentAssociation = get().activeAssociationCode ?? "SV";
      const newData = generateDummyData(currentAssociation);
      return {
        assignments: newData.assignments,
        compensations: newData.compensations,
        exchanges: newData.exchanges,
        nominationLists: generateMockNominationLists(),
        possiblePlayers: newData.possiblePlayers,
        scorers: newData.scorers,
      };
    }),

  setActiveAssociation: (associationCode: DemoAssociationCode) => {
    // Regenerate all data for the new association
    const data = generateDummyData(associationCode);
    set({
      assignments: data.assignments,
      compensations: data.compensations,
      exchanges: data.exchanges,
      nominationLists: generateMockNominationLists(),
      possiblePlayers: data.possiblePlayers,
      scorers: data.scorers,
      activeAssociationCode: associationCode,
    });
  },

  applyForExchange: (exchangeId: string) =>
    set((state) => {
      const now = new Date();
      return {
        exchanges: state.exchanges.map((exchange) =>
          exchange.__identity === exchangeId
            ? {
                ...exchange,
                status: "applied" as const,
                appliedAt: now.toISOString(),
                appliedBy: {
                  indoorReferee: {
                    person: {
                      __identity: "demo-me",
                      firstName: "Demo",
                      lastName: "User",
                      displayName: "Demo User",
                    },
                  },
                },
              }
            : exchange,
        ),
      };
    }),

  withdrawFromExchange: (exchangeId: string) =>
    set((state) => ({
      exchanges: state.exchanges.map((exchange) =>
        exchange.__identity === exchangeId
          ? {
              ...exchange,
              status: "open" as const,
              appliedAt: undefined,
              appliedBy: undefined,
            }
          : exchange,
      ),
    })),

  addAssignmentToExchange: (assignmentId: string) =>
    set((state) => {
      const assignment = state.assignments.find(
        (a) => a.__identity === assignmentId,
      );
      if (!assignment) return state;

      const now = new Date();
      const newExchange: GameExchange = {
        __identity: `demo-exchange-new-${Date.now()}`,
        status: "open",
        submittedAt: now.toISOString(),
        submittingType: "referee",
        refereePosition: assignment.refereePosition,
        requiredRefereeLevel: "N3",
        submittedByPerson: {
          __identity: "demo-me",
          firstName: "Demo",
          lastName: "User",
          displayName: "Demo User",
        },
        refereeGame: assignment.refereeGame,
      };

      return {
        exchanges: [...state.exchanges, newExchange],
      };
    }),

  updateCompensation: (
    compensationId: string,
    data: { distanceInMetres?: number },
  ) =>
    set((state) => ({
      compensations: state.compensations.map((comp) =>
        updateCompensationRecord(comp, compensationId, data),
      ),
    })),
}));
