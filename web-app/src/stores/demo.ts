import { create } from "zustand";
import type {
  Assignment,
  CompensationRecord,
  GameExchange,
  NominationList,
  PossibleNomination,
  PersonSearchResult,
  RefereeGame,
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

// Compensation rates per association type (CHF)
// SV (national) has higher rates than regional associations
const COMPENSATION_RATES = {
  SV: {
    HEAD_REFEREE: 100,
    SECOND_HEAD_REFEREE: 80,
    LINESMAN: 60,
    SECOND_LINESMAN: 50,
  },
  REGIONAL: {
    HEAD_REFEREE: 60,
    SECOND_HEAD_REFEREE: 50,
    LINESMAN: 40,
    SECOND_LINESMAN: 30,
  },
} as const;

const TRAVEL_EXPENSE_RATE_PER_KM = 0.7;

// Sample distances in metres for demo compensation records
const SAMPLE_DISTANCES = {
  SHORT: 24000,
  MEDIUM: 35000,
  MEDIUM_LONG: 48000,
  LONG: 62000,
  VERY_LONG: 89000,
} as const;

// Starting team identifier for auto-incrementing IDs
const BASE_TEAM_IDENTIFIER = 59591;

// Demo game numbers for assignments, compensations, and exchanges
const DEMO_GAME_NUMBERS = {
  ASSIGNMENTS: [382417, 382418, 382419, 382420, 382421] as const,
  COMPENSATIONS: [382500, 382501, 382502, 382503, 382504] as const,
  EXCHANGES: [382600, 382601, 382602, 382603, 382604] as const,
} as const;

function calculateTravelExpenses(distanceInMetres: number): number {
  const distanceInKm = distanceInMetres / 1000;
  return Math.round(distanceInKm * TRAVEL_EXPENSE_RATE_PER_KM * 100) / 100;
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

function calculateTotalCost(
  gameCompensation: number,
  travelExpenses: number,
): string {
  return formatCurrency(gameCompensation + travelExpenses);
}

type RefereePosition = "head-one" | "head-two" | "linesman-one" | "linesman-two";

function getCompensationForPosition(
  position: RefereePosition,
  isSV: boolean,
): number {
  const rates = isSV ? COMPENSATION_RATES.SV : COMPENSATION_RATES.REGIONAL;
  switch (position) {
    case "head-one":
      return rates.HEAD_REFEREE;
    case "head-two":
      return rates.SECOND_HEAD_REFEREE;
    case "linesman-one":
      return rates.LINESMAN;
    case "linesman-two":
      return rates.SECOND_LINESMAN;
  }
}

interface CompensationParams {
  position: RefereePosition;
  distanceInMetres: number;
  isSV: boolean;
  paymentDone: boolean;
  paymentValueDate?: string;
  transportationMode?: "car" | "train";
}

function createCompensationData({
  position,
  distanceInMetres,
  isSV,
  paymentDone,
  paymentValueDate,
  transportationMode = "car",
}: CompensationParams) {
  const gameCompensation = getCompensationForPosition(position, isSV);
  const travelExpenses = calculateTravelExpenses(distanceInMetres);
  const distanceInKm = distanceInMetres / 1000;

  return {
    gameCompensation,
    gameCompensationFormatted: formatCurrency(gameCompensation),
    travelExpenses,
    travelExpensesFormatted: formatCurrency(travelExpenses),
    distanceInMetres,
    distanceFormatted: distanceInKm.toFixed(1),
    costFormatted: calculateTotalCost(gameCompensation, travelExpenses),
    transportationMode,
    paymentDone,
    ...(paymentDone && paymentValueDate && { paymentValueDate }),
    hasFlexibleGameCompensations: false,
    hasFlexibleTravelExpenses: isSV,
    hasFlexibleOvernightStayExpenses: false,
    hasFlexibleCateringExpenses: false,
    overnightStayExpensesFormatted: "0.00",
    cateringExpensesFormatted: "0.00",
  };
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

// Configuration for venue/team data based on association type
interface VenueConfig {
  teamHome: { name: string; identifier: number };
  teamAway: { name: string; identifier: number };
  hall: {
    name: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
  };
}

// Venue configurations for different associations
const SV_VENUES: VenueConfig[] = [
  {
    teamHome: { name: "VBC Zürich Lions", identifier: BASE_TEAM_IDENTIFIER },
    teamAway: { name: "Volley Luzern", identifier: BASE_TEAM_IDENTIFIER + 1 },
    hall: {
      name: "Saalsporthalle Zürich",
      street: "Hardturmstrasse",
      houseNumber: "154",
      postalCode: "8005",
      city: "Zürich",
    },
  },
  {
    teamHome: { name: "Schönenwerd Smash", identifier: BASE_TEAM_IDENTIFIER + 2 },
    teamAway: { name: "Traktor Basel", identifier: BASE_TEAM_IDENTIFIER + 3 },
    hall: {
      name: "Aarehalle Schönenwerd",
      street: "Aarauerstrasse",
      houseNumber: "50",
      postalCode: "5012",
      city: "Schönenwerd",
    },
  },
  {
    teamHome: { name: "Volley Näfels", identifier: BASE_TEAM_IDENTIFIER + 4 },
    teamAway: { name: "Volero Zürich", identifier: BASE_TEAM_IDENTIFIER + 5 },
    hall: {
      name: "Lintharena Näfels",
      street: "Sportplatzstrasse",
      houseNumber: "1",
      postalCode: "8752",
      city: "Näfels",
    },
  },
  {
    teamHome: { name: "VFM Therwil", identifier: BASE_TEAM_IDENTIFIER + 6 },
    teamAway: { name: "Genève Volley", identifier: BASE_TEAM_IDENTIFIER + 7 },
    hall: {
      name: "Sporthalle Kuspo Therwil",
      street: "Im Letten",
      houseNumber: "2",
      postalCode: "4106",
      city: "Therwil",
    },
  },
  {
    teamHome: { name: "Volley Köniz", identifier: BASE_TEAM_IDENTIFIER + 8 },
    teamAway: { name: "VC Kanti", identifier: BASE_TEAM_IDENTIFIER + 9 },
    hall: {
      name: "Weissenstein Halle",
      street: "Weissensteinstrasse",
      houseNumber: "80",
      postalCode: "3008",
      city: "Bern",
    },
  },
];

const REGIONAL_VENUES: VenueConfig[] = [
  {
    teamHome: { name: "VBC Bern", identifier: BASE_TEAM_IDENTIFIER },
    teamAway: { name: "VC Münsingen", identifier: BASE_TEAM_IDENTIFIER + 1 },
    hall: {
      name: "Sporthalle Wankdorf",
      street: "Papiermühlestrasse",
      houseNumber: "71",
      postalCode: "3014",
      city: "Bern",
    },
  },
  {
    teamHome: { name: "TV Muri", identifier: BASE_TEAM_IDENTIFIER + 2 },
    teamAway: { name: "VBC Langenthal", identifier: BASE_TEAM_IDENTIFIER + 3 },
    hall: {
      name: "Sporthalle Muri",
      street: "Klosterweg",
      houseNumber: "8",
      postalCode: "5630",
      city: "Muri AG",
    },
  },
  {
    teamHome: { name: "VBC Thun", identifier: BASE_TEAM_IDENTIFIER + 4 },
    teamAway: { name: "VC Steffisburg", identifier: BASE_TEAM_IDENTIFIER + 5 },
    hall: {
      name: "Lachenhalle Thun",
      street: "Pestalozzistrasse",
      houseNumber: "1",
      postalCode: "3600",
      city: "Thun",
    },
  },
  {
    teamHome: { name: "VBC Solothurn", identifier: BASE_TEAM_IDENTIFIER + 6 },
    teamAway: { name: "VC Burgdorf", identifier: BASE_TEAM_IDENTIFIER + 7 },
    hall: {
      name: "Stadtturnsaal Solothurn",
      street: "Rossmarktplatz",
      houseNumber: "2",
      postalCode: "4500",
      city: "Solothurn",
    },
  },
  {
    teamHome: { name: "VBC Aarau", identifier: BASE_TEAM_IDENTIFIER + 8 },
    teamAway: { name: "TV Zofingen", identifier: BASE_TEAM_IDENTIFIER + 9 },
    hall: {
      name: "Schachen Halle Aarau",
      street: "Schachenallee",
      houseNumber: "29",
      postalCode: "5000",
      city: "Aarau",
    },
  },
];

function getVenuesForAssociation(
  associationCode: DemoAssociationCode,
): VenueConfig[] {
  return associationCode === "SV" ? SV_VENUES : REGIONAL_VENUES;
}

interface RefereeGameParams {
  gameId: string;
  gameNumber: number;
  gameDate: Date;
  venueIndex: number;
  leagueIndex: number;
  gender: "m" | "f";
  isGameInFuture: boolean;
  associationCode: DemoAssociationCode;
  idPrefix: string;
}

function createRefereeGame({
  gameId,
  gameNumber,
  gameDate,
  venueIndex,
  leagueIndex,
  gender,
  isGameInFuture,
  associationCode,
  idPrefix,
}: RefereeGameParams): RefereeGame {
  const venues = getVenuesForAssociation(associationCode);
  const leagues = getLeaguesForAssociation(associationCode);
  const venue = venues[venueIndex % venues.length]!;
  const league = leagues[leagueIndex % leagues.length]!;

  return {
    __identity: `${idPrefix}-game-${gameId}`,
    isGameInFuture: isGameInFuture ? "1" : "0",
    game: {
      __identity: `${idPrefix}-g-${gameId}`,
      number: gameNumber,
      startingDateTime: gameDate.toISOString(),
      playingWeekday: getWeekday(gameDate),
      encounter: {
        teamHome: {
          __identity: `team-${idPrefix}-${venueIndex * 2 + 1}`,
          name: venue.teamHome.name,
          identifier: venue.teamHome.identifier,
        },
        teamAway: {
          __identity: `team-${idPrefix}-${venueIndex * 2 + 2}`,
          name: venue.teamAway.name,
          identifier: venue.teamAway.identifier,
        },
      },
      hall: {
        __identity: `hall-${idPrefix}-${venueIndex + 1}`,
        name: venue.hall.name,
        primaryPostalAddress: createAddress({
          id: `addr-${idPrefix}-${venueIndex + 1}`,
          street: venue.hall.street,
          houseNumber: venue.hall.houseNumber,
          postalCode: venue.hall.postalCode,
          city: venue.hall.city,
        }),
      },
      group: {
        name: "Quali",
        managingAssociationShortName: associationCode,
        phase: {
          name: "Phase 1",
          league: {
            leagueCategory: league,
            gender,
          },
        },
      },
    },
  };
}

interface AssignmentConfig {
  index: number;
  status: "active" | "cancelled" | "archived";
  position: RefereePosition;
  confirmationStatus: "confirmed" | "pending";
  confirmationDaysAgo: number | null;
  gameDate: Date;
  venueIndex: number;
  leagueIndex: number;
  gender: "m" | "f";
  isGameInFuture: boolean;
  isOpenInExchange?: boolean;
  hasMessage?: boolean;
  linkedDouble?: string;
}

function createAssignment(
  config: AssignmentConfig,
  associationCode: DemoAssociationCode,
  now: Date,
): Assignment {
  return {
    __identity: `demo-assignment-${config.index}`,
    refereeConvocationStatus: config.status,
    refereePosition: config.position,
    confirmationStatus: config.confirmationStatus,
    confirmationDate:
      config.confirmationDaysAgo !== null
        ? subDays(now, config.confirmationDaysAgo).toISOString()
        : null,
    isOpenEntryInRefereeGameExchange: config.isOpenInExchange ?? false,
    hasLastMessageToReferee: config.hasMessage ?? false,
    hasLinkedDoubleConvocation: !!config.linkedDouble,
    ...(config.linkedDouble && {
      linkedDoubleConvocationGameNumberAndRefereePosition: config.linkedDouble,
    }),
    refereeGame: createRefereeGame({
      gameId: String(config.index),
      gameNumber: DEMO_GAME_NUMBERS.ASSIGNMENTS[config.index - 1]!,
      gameDate: config.gameDate,
      venueIndex: config.venueIndex,
      leagueIndex: config.leagueIndex,
      gender: config.gender,
      isGameInFuture: config.isGameInFuture,
      associationCode,
      idPrefix: "demo",
    }),
  };
}

function generateAssignments(
  associationCode: DemoAssociationCode,
  now: Date,
): Assignment[] {
  const configs: AssignmentConfig[] = [
    { index: 1, status: "active", position: "head-one", confirmationStatus: "confirmed", confirmationDaysAgo: 5, gameDate: addDays(now, 2), venueIndex: 0, leagueIndex: 0, gender: "m", isGameInFuture: true },
    { index: 2, status: "active", position: "linesman-one", confirmationStatus: "confirmed", confirmationDaysAgo: 3, gameDate: addHours(now, 3), venueIndex: 1, leagueIndex: 1, gender: "m", isGameInFuture: true, hasMessage: true },
    { index: 3, status: "active", position: "head-two", confirmationStatus: "pending", confirmationDaysAgo: null, gameDate: addDays(now, 5), venueIndex: 2, leagueIndex: 0, gender: "f", isGameInFuture: true, linkedDouble: "382420 / ARB 1" },
    { index: 4, status: "cancelled", position: "head-one", confirmationStatus: "confirmed", confirmationDaysAgo: 10, gameDate: addDays(now, 7), venueIndex: 3, leagueIndex: 1, gender: "f", isGameInFuture: true, isOpenInExchange: true },
    { index: 5, status: "archived", position: "linesman-two", confirmationStatus: "confirmed", confirmationDaysAgo: 14, gameDate: subDays(now, 3), venueIndex: 4, leagueIndex: associationCode === "SV" ? 1 : 2, gender: "m", isGameInFuture: false },
  ];

  return configs.map((config) => createAssignment(config, associationCode, now));
}

interface CompensationConfig {
  index: number;
  position: RefereePosition;
  daysAgo: number;
  venueIndex: number;
  leagueIndex: number;
  gender: "m" | "f";
  distance: keyof typeof SAMPLE_DISTANCES;
  paymentDone: boolean;
  paymentDaysAgo?: number;
  transportationMode?: "car" | "train";
}

function createCompensationRecord(
  config: CompensationConfig,
  associationCode: DemoAssociationCode,
  now: Date,
  isSV: boolean,
): CompensationRecord {
  return {
    __identity: `demo-comp-${config.index}`,
    refereeConvocationStatus: "active",
    refereePosition: config.position,
    compensationDate: subDays(now, config.daysAgo).toISOString(),
    refereeGame: createRefereeGame({
      gameId: String(config.index),
      gameNumber: DEMO_GAME_NUMBERS.COMPENSATIONS[config.index - 1]!,
      gameDate: subDays(now, config.daysAgo),
      venueIndex: config.venueIndex,
      leagueIndex: config.leagueIndex,
      gender: config.gender,
      isGameInFuture: false,
      associationCode,
      idPrefix: "comp",
    }),
    convocationCompensation: {
      __identity: `demo-cc-${config.index}`,
      ...createCompensationData({
        position: config.position,
        distanceInMetres: SAMPLE_DISTANCES[config.distance],
        isSV,
        paymentDone: config.paymentDone,
        ...(config.paymentDaysAgo !== undefined && {
          paymentValueDate: toDateString(subDays(now, config.paymentDaysAgo)),
        }),
        transportationMode: config.transportationMode,
      }),
    },
  };
}

function generateCompensations(
  associationCode: DemoAssociationCode,
  now: Date,
): CompensationRecord[] {
  const isSV = associationCode === "SV";

  const configs: CompensationConfig[] = [
    { index: 1, position: "head-one", daysAgo: 7, venueIndex: 0, leagueIndex: 0, gender: "m", distance: "MEDIUM_LONG", paymentDone: true, paymentDaysAgo: 2 },
    { index: 2, position: "linesman-one", daysAgo: 14, venueIndex: 1, leagueIndex: 1, gender: "m", distance: "MEDIUM", paymentDone: false },
    { index: 3, position: "head-two", daysAgo: 21, venueIndex: 2, leagueIndex: 0, gender: "f", distance: "LONG", paymentDone: true, paymentDaysAgo: 14 },
    { index: 4, position: "head-one", daysAgo: 5, venueIndex: 3, leagueIndex: 1, gender: "f", distance: "VERY_LONG", paymentDone: false },
    { index: 5, position: "linesman-two", daysAgo: 28, venueIndex: 4, leagueIndex: associationCode === "SV" ? 1 : 2, gender: "m", distance: "SHORT", paymentDone: true, paymentDaysAgo: 21, transportationMode: "train" },
  ];

  return configs.map((config) => createCompensationRecord(config, associationCode, now, isSV));
}

function generateExchanges(
  associationCode: DemoAssociationCode,
  now: Date,
): GameExchange[] {
  const isSV = associationCode === "SV";

  return [
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
        ...createRefereeGame({
          gameId: "1",
          gameNumber: 382600,
          gameDate: addDays(now, 4),
          venueIndex: 0,
          leagueIndex: 0,
          gender: "m",
          isGameInFuture: true,
          associationCode,
          idPrefix: "ex",
        }),
        activeFirstHeadRefereeName: "Max Müller",
        activeSecondHeadRefereeName: "Lisa Weber",
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
        ...createRefereeGame({
          gameId: "2",
          gameNumber: 382601,
          gameDate: addDays(now, 6),
          venueIndex: 1,
          leagueIndex: 1,
          gender: "m",
          isGameInFuture: true,
          associationCode,
          idPrefix: "ex",
        }),
        activeFirstHeadRefereeName: "Thomas Meier",
        activeSecondHeadRefereeName: "Sandra Keller",
        activeFirstLinesmanRefereeName: "Anna Schmidt",
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
        ...createRefereeGame({
          gameId: "3",
          gameNumber: 382602,
          gameDate: addDays(now, 8),
          venueIndex: 2,
          leagueIndex: 0,
          gender: "f",
          isGameInFuture: true,
          associationCode,
          idPrefix: "ex",
        }),
        activeFirstHeadRefereeName: "Laura Brunner",
        activeSecondHeadRefereeName: "Peter Weber",
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
        ...createRefereeGame({
          gameId: "4",
          gameNumber: 382603,
          gameDate: addDays(now, 10),
          venueIndex: 3,
          leagueIndex: 1,
          gender: "f",
          isGameInFuture: true,
          associationCode,
          idPrefix: "ex",
        }),
        activeFirstHeadRefereeName: "",
        activeSecondHeadRefereeName: "Julia Hofer",
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
        ...createRefereeGame({
          gameId: "5",
          gameNumber: 382604,
          gameDate: subDays(now, 2),
          venueIndex: 4,
          leagueIndex: associationCode === "SV" ? 1 : 2,
          gender: "m",
          isGameInFuture: false,
          associationCode,
          idPrefix: "ex",
        }),
        activeFirstHeadRefereeName: "Michael Fischer",
        activeSecondHeadRefereeName: "Nina Baumann",
        activeSecondLinesmanRefereeName: "Demo User",
      },
    },
  ];
}

function generatePossiblePlayers(): PossibleNomination[] {
  return [
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
}

function generateScorers(): PersonSearchResult[] {
  return [
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
}

function generateDummyData(associationCode: DemoAssociationCode = "SV") {
  const now = new Date();

  return {
    assignments: generateAssignments(associationCode, now),
    compensations: generateCompensations(associationCode, now),
    exchanges: generateExchanges(associationCode, now),
    possiblePlayers: generatePossiblePlayers(),
    scorers: generateScorers(),
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
