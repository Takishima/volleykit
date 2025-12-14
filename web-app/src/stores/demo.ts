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

interface DemoState {
  // Data arrays - populated when demo mode is enabled via useAuthStore
  assignments: Assignment[];
  compensations: CompensationRecord[];
  exchanges: GameExchange[];
  nominationLists: MockNominationLists;
  possiblePlayers: PossibleNomination[];
  scorers: PersonSearchResult[];

  // Demo user's referee level for filtering exchanges
  // Level string (e.g., "N2") and gradation value (higher = more qualified)
  userRefereeLevel: string | null;
  userRefereeLevelGradationValue: number | null;

  // Data lifecycle actions
  initializeDemoData: () => void;
  clearDemoData: () => void;
  refreshData: () => void;

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

function generateDummyData() {
  const now = new Date();

  const dummyAssignments: Assignment[] = [
    {
      __identity: "demo-assignment-1",
      refereeConvocationStatus: "active",
      refereePosition: "head-one",
      refereeGame: {
        __identity: "demo-game-1",
        game: {
          __identity: "demo-g-1",
          startingDateTime: addDays(now, 2).toISOString(),
          playingWeekday: getWeekday(addDays(now, 2)),
          encounter: {
            teamHome: {
              __identity: "team-1",
              name: "VBC Zürich Lions",
              identifier: 59591,
            },
            teamAway: {
              __identity: "team-2",
              name: "Volley Luzern",
              identifier: 59592,
            },
          },
          hall: { __identity: "hall-1", name: "Saalsporthalle Zürich" },
          group: {
            name: "Quali",
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: { name: "NLA", identifier: 1 },
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
      refereeGame: {
        __identity: "demo-game-2",
        game: {
          __identity: "demo-g-2",
          startingDateTime: addHours(addDays(now, 0), 3).toISOString(),
          playingWeekday: getWeekday(now),
          encounter: {
            teamHome: {
              __identity: "team-3",
              name: "Schönenwerd Smash",
              identifier: 59593,
            },
            teamAway: {
              __identity: "team-4",
              name: "Traktor Basel",
              identifier: 59594,
            },
          },
          hall: { __identity: "hall-2", name: "Aarehalle Schönenwerd" },
          group: {
            name: "Quali",
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: { name: "NLB", identifier: 2 },
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
      refereeGame: {
        __identity: "demo-game-3",
        game: {
          __identity: "demo-g-3",
          startingDateTime: addDays(now, 5).toISOString(),
          playingWeekday: getWeekday(addDays(now, 5)),
          encounter: {
            teamHome: {
              __identity: "team-5",
              name: "Volley Näfels",
              identifier: 59595,
            },
            teamAway: {
              __identity: "team-6",
              name: "Volero Zürich",
              identifier: 59596,
            },
          },
          hall: { __identity: "hall-3", name: "Lintharena Näfels" },
          group: {
            name: "Quali",
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: { name: "NLA", identifier: 1 },
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
      refereeGame: {
        __identity: "demo-game-4",
        game: {
          __identity: "demo-g-4",
          startingDateTime: addDays(now, 7).toISOString(),
          playingWeekday: getWeekday(addDays(now, 7)),
          encounter: {
            teamHome: {
              __identity: "team-7",
              name: "VFM Therwil",
              identifier: 59597,
            },
            teamAway: {
              __identity: "team-8",
              name: "Genève Volley",
              identifier: 59598,
            },
          },
          hall: { __identity: "hall-4", name: "Sporthalle Kuspo Therwil" },
          group: {
            name: "Quali",
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: { name: "1L", identifier: 3 },
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
      refereeGame: {
        __identity: "demo-game-5",
        game: {
          __identity: "demo-g-5",
          startingDateTime: subDays(now, 3).toISOString(),
          playingWeekday: getWeekday(subDays(now, 3)),
          encounter: {
            teamHome: {
              __identity: "team-9",
              name: "Volley Köniz",
              identifier: 59599,
            },
            teamAway: {
              __identity: "team-10",
              name: "VC Kanti",
              identifier: 59600,
            },
          },
          hall: { __identity: "hall-5", name: "Weissenstein Halle" },
          group: {
            name: "Quali",
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: { name: "2L", identifier: 4 },
                gender: "m",
              },
            },
          },
        },
      },
    },
  ];

  const dummyCompensations: CompensationRecord[] = [
    {
      __identity: "demo-comp-1",
      refereeConvocationStatus: "active",
      refereePosition: "head-one",
      refereeGame: {
        __identity: "demo-comp-game-1",
        game: {
          __identity: "demo-cg-1",
          startingDateTime: subDays(now, 7).toISOString(),
          encounter: {
            teamHome: {
              __identity: "team-11",
              name: "VBC Zürich Lions",
              identifier: 59601,
            },
            teamAway: {
              __identity: "team-12",
              name: "Volley Luzern",
              identifier: 59602,
            },
          },
        },
      },
      convocationCompensation: {
        __identity: "demo-cc-1",
        paymentDone: true,
        gameCompensation: 100,
        travelExpenses: 33.6,
        distanceInMetres: 48000,
        transportationMode: "car",
      },
    },
    {
      __identity: "demo-comp-2",
      refereeConvocationStatus: "active",
      refereePosition: "linesman-one",
      refereeGame: {
        __identity: "demo-comp-game-2",
        game: {
          __identity: "demo-cg-2",
          startingDateTime: subDays(now, 14).toISOString(),
          encounter: {
            teamHome: {
              __identity: "team-13",
              name: "Schönenwerd Smash",
              identifier: 59603,
            },
            teamAway: {
              __identity: "team-14",
              name: "Traktor Basel",
              identifier: 59604,
            },
          },
        },
      },
      convocationCompensation: {
        __identity: "demo-cc-2",
        paymentDone: false,
        gameCompensation: 60,
        travelExpenses: 24.5,
        distanceInMetres: 35000,
        transportationMode: "car",
      },
    },
    {
      __identity: "demo-comp-3",
      refereeConvocationStatus: "active",
      refereePosition: "head-two",
      refereeGame: {
        __identity: "demo-comp-game-3",
        game: {
          __identity: "demo-cg-3",
          startingDateTime: subDays(now, 21).toISOString(),
          encounter: {
            teamHome: {
              __identity: "team-15",
              name: "Volley Näfels",
              identifier: 59605,
            },
            teamAway: {
              __identity: "team-16",
              name: "Volero Zürich",
              identifier: 59606,
            },
          },
        },
      },
      convocationCompensation: {
        __identity: "demo-cc-3",
        paymentDone: true,
        gameCompensation: 80,
        travelExpenses: 43.4,
        distanceInMetres: 62000,
        transportationMode: "car",
      },
    },
    {
      __identity: "demo-comp-4",
      refereeConvocationStatus: "active",
      refereePosition: "head-one",
      refereeGame: {
        __identity: "demo-comp-game-4",
        game: {
          __identity: "demo-cg-4",
          startingDateTime: subDays(now, 5).toISOString(),
          encounter: {
            teamHome: {
              __identity: "team-17",
              name: "VFM Therwil",
              identifier: 59607,
            },
            teamAway: {
              __identity: "team-18",
              name: "Genève Volley",
              identifier: 59608,
            },
          },
        },
      },
      convocationCompensation: {
        __identity: "demo-cc-4",
        paymentDone: false,
        gameCompensation: 100,
        travelExpenses: 62.3,
        distanceInMetres: 89000,
        transportationMode: "car",
      },
    },
    {
      __identity: "demo-comp-5",
      refereeConvocationStatus: "active",
      refereePosition: "linesman-two",
      refereeGame: {
        __identity: "demo-comp-game-5",
        game: {
          __identity: "demo-cg-5",
          startingDateTime: subDays(now, 28).toISOString(),
          encounter: {
            teamHome: {
              __identity: "team-19",
              name: "Volley Köniz",
              identifier: 59609,
            },
            teamAway: {
              __identity: "team-20",
              name: "VC Kanti",
              identifier: 59610,
            },
          },
        },
      },
      convocationCompensation: {
        __identity: "demo-cc-5",
        paymentDone: true,
        gameCompensation: 50,
        travelExpenses: 16.8,
        distanceInMetres: 24000,
        transportationMode: "train",
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
      submittedByPerson: {
        __identity: "demo-person-1",
        firstName: "Max",
        lastName: "Müller",
        displayName: "Max Müller",
      },
      refereeGame: {
        __identity: "demo-ex-game-1",
        game: {
          __identity: "demo-exg-1",
          startingDateTime: addDays(now, 4).toISOString(),
          encounter: {
            teamHome: {
              __identity: "team-21",
              name: "VBC Zürich Lions",
              identifier: 59611,
            },
            teamAway: {
              __identity: "team-22",
              name: "Volley Luzern",
              identifier: 59612,
            },
          },
          hall: { __identity: "hall-6", name: "Saalsporthalle Zürich" },
          group: {
            name: "Quali",
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: { name: "NLA", identifier: 1 },
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
      submittedByPerson: {
        __identity: "demo-person-2",
        firstName: "Anna",
        lastName: "Schmidt",
        displayName: "Anna Schmidt",
      },
      refereeGame: {
        __identity: "demo-ex-game-2",
        game: {
          __identity: "demo-exg-2",
          startingDateTime: addDays(now, 6).toISOString(),
          encounter: {
            teamHome: {
              __identity: "team-23",
              name: "Schönenwerd Smash",
              identifier: 59613,
            },
            teamAway: {
              __identity: "team-24",
              name: "Traktor Basel",
              identifier: 59614,
            },
          },
          hall: { __identity: "hall-7", name: "Aarehalle Schönenwerd" },
          group: {
            name: "Quali",
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: { name: "NLB", identifier: 2 },
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
        game: {
          __identity: "demo-exg-3",
          startingDateTime: addDays(now, 8).toISOString(),
          encounter: {
            teamHome: {
              __identity: "team-25",
              name: "Volley Näfels",
              identifier: 59615,
            },
            teamAway: {
              __identity: "team-26",
              name: "Volero Zürich",
              identifier: 59616,
            },
          },
          hall: { __identity: "hall-8", name: "Lintharena Näfels" },
          group: {
            name: "Quali",
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: { name: "NLA", identifier: 1 },
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
      requiredRefereeLevel: "N1",
      submittedByPerson: {
        __identity: "demo-person-4",
        firstName: "Sara",
        lastName: "Keller",
        displayName: "Sara Keller",
      },
      refereeGame: {
        __identity: "demo-ex-game-4",
        game: {
          __identity: "demo-exg-4",
          startingDateTime: addDays(now, 10).toISOString(),
          encounter: {
            teamHome: {
              __identity: "team-27",
              name: "VFM Therwil",
              identifier: 59617,
            },
            teamAway: {
              __identity: "team-28",
              name: "Genève Volley",
              identifier: 59618,
            },
          },
          hall: { __identity: "hall-9", name: "Sporthalle Kuspo Therwil" },
          group: {
            name: "Quali",
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: { name: "1L", identifier: 3 },
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
      submittedByPerson: {
        __identity: "demo-person-5",
        firstName: "Thomas",
        lastName: "Huber",
        displayName: "Thomas Huber",
      },
      refereeGame: {
        __identity: "demo-ex-game-5",
        game: {
          __identity: "demo-exg-5",
          startingDateTime: subDays(now, 2).toISOString(),
          encounter: {
            teamHome: {
              __identity: "team-29",
              name: "Volley Köniz",
              identifier: 59619,
            },
            teamAway: {
              __identity: "team-30",
              name: "VC Kanti",
              identifier: 59620,
            },
          },
          hall: { __identity: "hall-10", name: "Weissenstein Halle" },
          group: {
            name: "Quali",
            phase: {
              name: "Phase 1",
              league: {
                leagueCategory: { name: "2L", identifier: 4 },
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
      __identity: "demo-scorer-1",
      firstName: "Hans",
      lastName: "Müller",
      displayName: "Hans Müller",
      associationId: 12345,
      birthday: "1985-03-15T00:00:00+00:00",
      gender: "m",
    },
    {
      __identity: "demo-scorer-2",
      firstName: "Maria",
      lastName: "Müller",
      displayName: "Maria Müller",
      associationId: 12346,
      birthday: "1990-07-22T00:00:00+00:00",
      gender: "f",
    },
    {
      __identity: "demo-scorer-3",
      firstName: "Peter",
      lastName: "Schmidt",
      displayName: "Peter Schmidt",
      associationId: 23456,
      birthday: "1978-11-08T00:00:00+00:00",
      gender: "m",
    },
    {
      __identity: "demo-scorer-4",
      firstName: "Anna",
      lastName: "Weber",
      displayName: "Anna Weber",
      associationId: 34567,
      birthday: "1995-01-30T00:00:00+00:00",
      gender: "f",
    },
    {
      __identity: "demo-scorer-5",
      firstName: "Thomas",
      lastName: "Brunner",
      displayName: "Thomas Brunner",
      associationId: 45678,
      birthday: "1982-09-12T00:00:00+00:00",
      gender: "m",
    },
    {
      __identity: "demo-scorer-6",
      firstName: "Sandra",
      lastName: "Keller",
      displayName: "Sandra Keller",
      associationId: 56789,
      birthday: "1988-05-25T00:00:00+00:00",
      gender: "f",
    },
    {
      __identity: "demo-scorer-7",
      firstName: "Marco",
      lastName: "Meier",
      displayName: "Marco Meier",
      associationId: 67890,
      birthday: "1992-12-03T00:00:00+00:00",
      gender: "m",
    },
    {
      __identity: "demo-scorer-8",
      firstName: "Lisa",
      lastName: "Fischer",
      displayName: "Lisa Fischer",
      associationId: 78901,
      birthday: "1985-08-18T00:00:00+00:00",
      gender: "f",
    },
    {
      __identity: "demo-scorer-9",
      firstName: "Stefan",
      lastName: "Huber",
      displayName: "Stefan Huber",
      associationId: 89012,
      birthday: "1975-04-07T00:00:00+00:00",
      gender: "m",
    },
    {
      __identity: "demo-scorer-10",
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

export const useDemoStore = create<DemoState>()((set) => ({
  assignments: [],
  compensations: [],
  exchanges: [],
  nominationLists: {},
  possiblePlayers: [],
  scorers: [],
  userRefereeLevel: null,
  userRefereeLevelGradationValue: null,

  initializeDemoData: () => {
    const data = generateDummyData();
    set({
      assignments: data.assignments,
      compensations: data.compensations,
      exchanges: data.exchanges,
      nominationLists: generateMockNominationLists(),
      possiblePlayers: data.possiblePlayers,
      scorers: data.scorers,
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
      userRefereeLevel: null,
      userRefereeLevelGradationValue: null,
    }),

  refreshData: () =>
    set(() => {
      const newData = generateDummyData();
      return {
        assignments: newData.assignments,
        compensations: newData.compensations,
        exchanges: newData.exchanges,
        nominationLists: generateMockNominationLists(),
        possiblePlayers: newData.possiblePlayers,
        scorers: newData.scorers,
      };
    }),

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
