import { create } from "zustand";
import type {
  Assignment,
  CompensationRecord,
  GameExchange,
} from "@/api/client";
import { addDays, addHours, subDays } from "date-fns";

interface DemoState {
  // Data arrays - populated when demo mode is enabled via useAuthStore
  assignments: Assignment[];
  compensations: CompensationRecord[];
  exchanges: GameExchange[];

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

  return {
    assignments: dummyAssignments,
    compensations: dummyCompensations,
    exchanges: dummyExchanges,
  };
}

// Demo user referee level configuration
// N2 level with gradation value 2 (can officiate N2+ and N3+ games, but not N1+)
const DEMO_USER_REFEREE_LEVEL = "N2";
const DEMO_USER_REFEREE_LEVEL_GRADATION_VALUE = 2;

export const useDemoStore = create<DemoState>()((set) => ({
  assignments: [],
  compensations: [],
  exchanges: [],
  userRefereeLevel: null,
  userRefereeLevelGradationValue: null,

  initializeDemoData: () => {
    const data = generateDummyData();
    set({
      assignments: data.assignments,
      compensations: data.compensations,
      exchanges: data.exchanges,
      userRefereeLevel: DEMO_USER_REFEREE_LEVEL,
      userRefereeLevelGradationValue: DEMO_USER_REFEREE_LEVEL_GRADATION_VALUE,
    });
  },

  clearDemoData: () =>
    set({
      assignments: [],
      compensations: [],
      exchanges: [],
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
