import { create } from "zustand";
import { persist } from "zustand/middleware";
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
import { formatDistanceKm, metresToKilometres } from "@/utils/distance";

// Valid variant characters for UUID v4 (RFC 4122)
const UUID_VARIANT_CHARS = ["8", "9", "a", "b"] as const;

/** Hash a string to a 32-bit integer using djb2-like algorithm. */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash | 0;
  }
  return hash;
}

/** Hash a string in reverse for additional entropy. */
function hashStringReverse(str: string): number {
  let hash = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    hash = (hash << 3) + hash + str.charCodeAt(i);
    hash = hash | 0;
  }
  return hash;
}

/** Convert a number to an 8-character hex string. */
function toHex8(n: number): string {
  return Math.abs(n).toString(16).padStart(8, "0").slice(0, 8);
}

/**
 * Generate a deterministic UUID v4 from a seed string.
 * Uses hashing to create reproducible UUIDs for demo data,
 * ensuring mock data passes UUID validation while remaining predictable.
 */
function generateDemoUuid(seed: string): string {
  const h1 = hashString(seed);
  const h2 = hashStringReverse(seed);
  const hex1 = toHex8(h1);
  const hex2 = toHex8(h2);
  const hex3 = toHex8(h1 + h2);
  const hex4 = toHex8(h1 * 2 + h2);
  const variant = UUID_VARIANT_CHARS[Math.abs(h1) % 4];

  return `${hex1}-${hex2.slice(0, 4)}-4${hex2.slice(5, 8)}-${variant}${hex3.slice(1, 4)}-${hex3.slice(4, 8)}${hex4.slice(0, 8)}`;
}

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

// Validated game data stored after finalization
export interface ValidatedGameData {
  validatedAt: string;
  scorer: {
    __identity: string;
    displayName: string;
  };
  scoresheetFileId?: string;
  homeRosterClosed: boolean;
  awayRosterClosed: boolean;
}

interface DemoState {
  // Data arrays - populated when demo mode is enabled via useAuthStore
  assignments: Assignment[];
  compensations: CompensationRecord[];
  exchanges: GameExchange[];
  nominationLists: MockNominationLists;
  possiblePlayers: PossibleNomination[];
  scorers: PersonSearchResult[];

  // Validated games - keyed by game ID
  validatedGames: Record<string, ValidatedGameData>;

  // Current active association code for region-specific data
  activeAssociationCode: DemoAssociationCode | null;

  // Demo user's referee level for filtering exchanges
  // Level string (e.g., "N2") and gradation value (higher = more qualified)
  userRefereeLevel: string | null;
  userRefereeLevelGradationValue: number | null;

  // Timestamp when demo data was generated (for staleness check)
  generatedAt: number | null;

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
    data: { distanceInMetres?: number; correctionReason?: string },
  ) => void;

  // Game validation operations
  markGameValidated: (
    gameId: string,
    data: {
      scorer: { __identity: string; displayName: string };
      scoresheetFileId?: string;
    },
  ) => void;
  isGameValidated: (gameId: string) => boolean;
  getValidatedGameData: (gameId: string) => ValidatedGameData | null;
  updateNominationListClosed: (
    gameId: string,
    team: "home" | "away",
    closed: boolean,
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
  const distanceInKm = metresToKilometres(distanceInMetres);
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
  correctionReason?: string | null;
}

function createCompensationData({
  position,
  distanceInMetres,
  isSV,
  paymentDone,
  paymentValueDate,
  transportationMode = "car",
  correctionReason = null,
}: CompensationParams) {
  const gameCompensation = getCompensationForPosition(position, isSV);
  const travelExpenses = calculateTravelExpenses(distanceInMetres);

  return {
    gameCompensation,
    gameCompensationFormatted: formatCurrency(gameCompensation),
    travelExpenses,
    travelExpensesFormatted: formatCurrency(travelExpenses),
    distanceInMetres,
    distanceFormatted: formatDistanceKm(distanceInMetres),
    costFormatted: calculateTotalCost(gameCompensation, travelExpenses),
    transportationMode,
    paymentDone,
    correctionReason,
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
  data: { distanceInMetres?: number; correctionReason?: string },
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
      ...(data.correctionReason !== undefined && {
        correctionReason: data.correctionReason,
      }),
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

// Mock referee names for demo data
const MOCK_REFEREES = [
  { firstName: "Thomas", lastName: "Meier" },
  { firstName: "Sandra", lastName: "Keller" },
  { firstName: "Michael", lastName: "Fischer" },
  { firstName: "Laura", lastName: "Brunner" },
  { firstName: "Stefan", lastName: "Huber" },
  { firstName: "Nina", lastName: "Baumann" },
] as const;

function createRefereeConvocation(
  idPrefix: string,
  gameId: string,
  position: "first" | "second",
  refereeIndex: number,
) {
  const referee = MOCK_REFEREES[refereeIndex % MOCK_REFEREES.length]!;
  const displayName = `${referee.firstName} ${referee.lastName}`;
  return {
    indoorAssociationReferee: {
      indoorReferee: {
        person: {
          __identity: generateDemoUuid(`${idPrefix}-referee-${position}-${gameId}`),
          firstName: referee.firstName,
          lastName: referee.lastName,
          displayName,
        },
      },
    },
  };
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
    __identity: generateDemoUuid(`${idPrefix}-game-${gameId}`),
    isGameInFuture: isGameInFuture ? "1" : "0",
    activeRefereeConvocationFirstHeadReferee: createRefereeConvocation(
      idPrefix,
      gameId,
      "first",
      venueIndex * 2,
    ),
    activeRefereeConvocationSecondHeadReferee: createRefereeConvocation(
      idPrefix,
      gameId,
      "second",
      venueIndex * 2 + 1,
    ),
    game: {
      __identity: generateDemoUuid(`${idPrefix}-g-${gameId}`),
      number: gameNumber,
      startingDateTime: gameDate.toISOString(),
      playingWeekday: getWeekday(gameDate),
      encounter: {
        teamHome: {
          __identity: generateDemoUuid(`team-${idPrefix}-${venueIndex * 2 + 1}`),
          name: venue.teamHome.name,
          identifier: venue.teamHome.identifier,
        },
        teamAway: {
          __identity: generateDemoUuid(`team-${idPrefix}-${venueIndex * 2 + 2}`),
          name: venue.teamAway.name,
          identifier: venue.teamAway.identifier,
        },
      },
      hall: {
        __identity: generateDemoUuid(`hall-${idPrefix}-${venueIndex + 1}`),
        name: venue.hall.name,
        primaryPostalAddress: createAddress({
          id: generateDemoUuid(`addr-${idPrefix}-${venueIndex + 1}`),
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
    __identity: generateDemoUuid(`demo-assignment-${config.index}`),
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
  correctionReason?: string | null;
}

function createCompensationRecord(
  config: CompensationConfig,
  associationCode: DemoAssociationCode,
  now: Date,
  isSV: boolean,
): CompensationRecord {
  return {
    __identity: generateDemoUuid(`demo-comp-${config.index}`),
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
      __identity: generateDemoUuid(`demo-cc-${config.index}`),
      ...createCompensationData({
        position: config.position,
        distanceInMetres: SAMPLE_DISTANCES[config.distance],
        isSV,
        paymentDone: config.paymentDone,
        ...(config.paymentDaysAgo !== undefined && {
          paymentValueDate: toDateString(subDays(now, config.paymentDaysAgo)),
        }),
        transportationMode: config.transportationMode,
        correctionReason: config.correctionReason,
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
    { index: 1, position: "head-one", daysAgo: 7, venueIndex: 0, leagueIndex: 0, gender: "m", distance: "MEDIUM_LONG", paymentDone: true, paymentDaysAgo: 2, correctionReason: "Ich wohne in Oberengstringen" },
    { index: 2, position: "linesman-one", daysAgo: 14, venueIndex: 1, leagueIndex: 1, gender: "m", distance: "MEDIUM", paymentDone: false },
    { index: 3, position: "head-two", daysAgo: 21, venueIndex: 2, leagueIndex: 0, gender: "f", distance: "LONG", paymentDone: true, paymentDaysAgo: 14, correctionReason: "Umweg wegen Baustelle" },
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
      __identity: generateDemoUuid("demo-exchange-1"),
      status: "open",
      submittedAt: subDays(now, 2).toISOString(),
      submittingType: "referee",
      refereePosition: "head-one",
      requiredRefereeLevel: "N3",
      requiredRefereeLevelGradationValue: "1",
      submittedByPerson: {
        __identity: generateDemoUuid("demo-person-1"),
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
      __identity: generateDemoUuid("demo-exchange-2"),
      status: "open",
      submittedAt: subDays(now, 1).toISOString(),
      submittingType: "referee",
      refereePosition: "linesman-one",
      requiredRefereeLevel: "N2",
      requiredRefereeLevelGradationValue: "2",
      submittedByPerson: {
        __identity: generateDemoUuid("demo-person-2"),
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
      __identity: generateDemoUuid("demo-exchange-3"),
      status: "applied",
      submittedAt: subDays(now, 5).toISOString(),
      submittingType: "referee",
      refereePosition: "head-two",
      requiredRefereeLevel: "N2",
      requiredRefereeLevelGradationValue: "1",
      submittedByPerson: {
        __identity: generateDemoUuid("demo-person-3"),
        firstName: "Peter",
        lastName: "Weber",
        displayName: "Peter Weber",
      },
      appliedBy: {
        indoorReferee: {
          person: {
            __identity: generateDemoUuid("demo-me"),
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
      __identity: generateDemoUuid("demo-exchange-4"),
      status: "open",
      submittedAt: subDays(now, 3).toISOString(),
      submittingType: "admin",
      refereePosition: "head-one",
      requiredRefereeLevel: isSV ? "N1" : "N2",
      requiredRefereeLevelGradationValue: "1",
      submittedByPerson: {
        __identity: generateDemoUuid("demo-person-4"),
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
      __identity: generateDemoUuid("demo-exchange-5"),
      status: "closed",
      submittedAt: subDays(now, 10).toISOString(),
      submittingType: "referee",
      refereePosition: "linesman-two",
      requiredRefereeLevel: "N3",
      requiredRefereeLevelGradationValue: "3",
      submittedByPerson: {
        __identity: generateDemoUuid("demo-person-5"),
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
  // Extended list of Swiss names for demo purposes
  const players = [
    { firstName: "Max", lastName: "Müller", birthday: "1995-03-15", category: "SEN" },
    { firstName: "Anna", lastName: "Schmidt", birthday: "1998-07-22", category: "SEN" },
    { firstName: "Thomas", lastName: "Weber", birthday: "2002-11-08", category: "JUN" },
    { firstName: "Laura", lastName: "Keller", birthday: "1996-05-30", category: "SEN", nominated: true },
    { firstName: "Marco", lastName: "Rossi", birthday: "2003-09-12", category: "JUN" },
    { firstName: "Sophie", lastName: "Dubois", birthday: "1994-02-18", category: "SEN" },
    { firstName: "Luca", lastName: "Bernasconi", birthday: "2001-06-25", category: "JUN" },
    { firstName: "Nina", lastName: "Hofmann", birthday: "1997-12-03", category: "SEN" },
    { firstName: "David", lastName: "Frei", birthday: "1999-04-17", category: "SEN" },
    { firstName: "Sarah", lastName: "Brunner", birthday: "2000-08-29", category: "SEN" },
    { firstName: "Fabian", lastName: "Gerber", birthday: "1993-01-11", category: "SEN" },
    { firstName: "Julia", lastName: "Baumann", birthday: "2004-03-05", category: "JUN" },
    { firstName: "Patrick", lastName: "Steiner", birthday: "1992-06-20", category: "SEN" },
    { firstName: "Céline", lastName: "Moser", birthday: "1998-10-14", category: "SEN" },
    { firstName: "Yannick", lastName: "Hofer", birthday: "2001-12-31", category: "JUN" },
    { firstName: "Lea", lastName: "Zimmermann", birthday: "1997-02-08", category: "SEN" },
    { firstName: "Nicolas", lastName: "Lehmann", birthday: "1995-09-23", category: "SEN" },
    { firstName: "Vanessa", lastName: "Bieri", birthday: "2003-07-16", category: "JUN" },
    { firstName: "Kevin", lastName: "Lang", birthday: "1994-11-02", category: "SEN" },
    { firstName: "Melanie", lastName: "Roth", birthday: "1999-05-27", category: "SEN" },
    { firstName: "Simon", lastName: "Koch", birthday: "2002-01-19", category: "JUN" },
    { firstName: "Jasmin", lastName: "Widmer", birthday: "1996-08-12", category: "SEN" },
    { firstName: "Florian", lastName: "Schmid", birthday: "1993-04-06", category: "SEN" },
    { firstName: "Noemi", lastName: "Huber", birthday: "2000-10-25", category: "SEN" },
    { firstName: "Sandro", lastName: "Meyer", birthday: "1998-03-09", category: "SEN" },
  ];

  return players.map((player, index) => ({
    __identity: generateDemoUuid(`demo-possible-${index + 1}`),
    indoorPlayer: {
      __identity: generateDemoUuid(`demo-player-${index + 1}`),
      person: {
        __identity: generateDemoUuid(`demo-person-p${index + 1}`),
        displayName: `${player.firstName} ${player.lastName}`,
        firstName: player.firstName,
        lastName: player.lastName,
        birthday: player.birthday,
      },
    },
    licenseCategory: player.category,
    isAlreadyNominated: player.nominated ?? false,
  }));
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

// Player nomination configuration for nomination lists
interface PlayerNominationConfig {
  index: number;
  shirtNumber: number;
  firstName: string;
  lastName: string;
  licenseCategory: "SEN" | "JUN";
  isCaptain?: boolean;
  isLibero?: boolean;
}

function createPlayerNomination(
  config: PlayerNominationConfig,
  gameIndex: number,
  teamIndex: number,
) {
  const identity = `demo-nom-${gameIndex}-${teamIndex}-${config.index}`;
  const displayName = `${config.firstName} ${config.lastName}`;
  // Generate a deterministic birthday based on indices
  const birthYear = config.licenseCategory === "JUN" ? 2003 + (config.index % 3) : 1990 + (config.index % 8);
  const birthMonth = ((config.index + teamIndex) % 12) + 1;
  const birthDay = ((config.index + gameIndex) % 28) + 1;
  const birthday = `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`;
  return {
    __identity: identity,
    shirtNumber: config.shirtNumber,
    isCaptain: config.isCaptain ?? false,
    isLibero: config.isLibero ?? false,
    indoorPlayer: {
      __identity: `demo-player-${gameIndex}-${teamIndex}-${config.index}`,
      person: {
        __identity: `demo-person-${gameIndex}-${teamIndex}-${config.index}`,
        firstName: config.firstName,
        lastName: config.lastName,
        displayName,
        birthday,
      },
    },
    indoorPlayerLicenseCategory: {
      __identity: `lic-${config.licenseCategory.toLowerCase()}`,
      shortName: config.licenseCategory,
    },
  };
}

// Nomination list configuration for a team in a game
interface NominationListConfig {
  gameId: string;
  teamId: string;
  teamDisplayName: string;
  side: "home" | "away";
  players: PlayerNominationConfig[];
}

function createNominationList(
  config: NominationListConfig,
  gameIndex: number,
  teamIndex: number,
): NominationList {
  return {
    __identity: `demo-nomlist-${config.side}-${gameIndex}`,
    game: { __identity: config.gameId },
    team: { __identity: config.teamId, displayName: config.teamDisplayName },
    closed: false,
    isClosedForTeam: false,
    indoorPlayerNominations: config.players.map((player) =>
      createPlayerNomination(player, gameIndex, teamIndex),
    ),
  };
}

// Configuration data for mock nomination lists
// Note: gameIndex corresponds to assignment config indices (1-5)
// Only games where the user is 1st referee (head-one) need rosters
interface NominationListGameConfig {
  gameIndex: number;
  home: Omit<NominationListConfig, "gameId" | "side">;
  away: Omit<NominationListConfig, "gameId" | "side">;
}

// Nomination list configs for games where user is 1st referee (head-one position)
// Assignment index 1 has head-one position - this is the primary game for roster validation
const NOMINATION_LIST_CONFIGS: NominationListGameConfig[] = [
  {
    // Matches assignment index 1: head-one, VBC Zürich Lions vs Volley Luzern
    gameIndex: 1,
    home: {
      teamId: "team-demo-1",
      teamDisplayName: "VBC Zürich Lions",
      players: [
        { index: 1, shirtNumber: 1, firstName: "Marco", lastName: "Meier", licenseCategory: "SEN", isCaptain: true },
        { index: 2, shirtNumber: 7, firstName: "Lukas", lastName: "Schneider", licenseCategory: "SEN" },
        { index: 3, shirtNumber: 12, firstName: "Noah", lastName: "Weber", licenseCategory: "JUN", isLibero: true },
        { index: 4, shirtNumber: 5, firstName: "Felix", lastName: "Keller", licenseCategory: "SEN" },
        { index: 5, shirtNumber: 9, firstName: "Tim", lastName: "Fischer", licenseCategory: "SEN" },
        { index: 6, shirtNumber: 14, firstName: "Jan", lastName: "Brunner", licenseCategory: "SEN" },
      ],
    },
    away: {
      teamId: "team-demo-2",
      teamDisplayName: "Volley Luzern",
      players: [
        { index: 1, shirtNumber: 3, firstName: "David", lastName: "Steiner", licenseCategory: "SEN", isCaptain: true },
        { index: 2, shirtNumber: 8, firstName: "Simon", lastName: "Frei", licenseCategory: "SEN" },
        { index: 3, shirtNumber: 11, firstName: "Luca", lastName: "Gerber", licenseCategory: "JUN", isLibero: true },
        { index: 4, shirtNumber: 6, firstName: "Yannick", lastName: "Hofer", licenseCategory: "SEN" },
        { index: 5, shirtNumber: 10, firstName: "Nico", lastName: "Baumann", licenseCategory: "SEN" },
      ],
    },
  },
];

function generateMockNominationLists(): MockNominationLists {
  const result: MockNominationLists = {};

  for (const config of NOMINATION_LIST_CONFIGS) {
    // Generate the same game UUID used by assignments
    // This matches createRefereeGame which uses: generateDemoUuid(`${idPrefix}-g-${gameId}`)
    // For assignment configs, idPrefix is "demo" and gameId is the config index
    const gameUuid = generateDemoUuid(`demo-g-${config.gameIndex}`);

    result[gameUuid] = {
      home: createNominationList(
        { ...config.home, gameId: gameUuid, side: "home" },
        config.gameIndex,
        1,
      ),
      away: createNominationList(
        { ...config.away, gameId: gameUuid, side: "away" },
        config.gameIndex,
        2,
      ),
    };
  }

  return result;
}

// Demo user referee level configuration
// Gradation scale: N1=1 (highest/most qualified), N2=2, N3=3 (lowest)
// Lower gradation value = higher qualification level
// N2 referee (gradation 2) can officiate N2+ and N3+ games, but not N1+
const DEMO_USER_REFEREE_LEVEL = "N2";
const DEMO_USER_REFEREE_LEVEL_GRADATION_VALUE = 2;

// Demo data is considered stale after 6 hours - regenerate fresh data on next load
const DEMO_DATA_STALENESS_MS = 6 * 60 * 60 * 1000;

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      assignments: [],
      compensations: [],
      exchanges: [],
      nominationLists: {},
      possiblePlayers: [],
      scorers: [],
      validatedGames: {},
      activeAssociationCode: null,
      userRefereeLevel: null,
      userRefereeLevelGradationValue: null,
      generatedAt: null,

      initializeDemoData: (associationCode: DemoAssociationCode = "SV") => {
        // Only regenerate if no data exists or association is changing
        const currentState = get();
        const hasExistingData = currentState.assignments.length > 0;
        const isSameAssociation =
          currentState.activeAssociationCode === associationCode;

        if (hasExistingData && isSameAssociation) {
          // Preserve existing modifications
          return;
        }

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
          generatedAt: Date.now(),
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
          validatedGames: {},
          activeAssociationCode: null,
          userRefereeLevel: null,
          userRefereeLevelGradationValue: null,
          generatedAt: null,
        }),

      refreshData: () =>
        set(() => {
          const currentAssociation = get().activeAssociationCode ?? "SV";
          const newData = generateDummyData(currentAssociation);
          // Note: validatedGames is preserved to maintain user's validation history
          return {
            assignments: newData.assignments,
            compensations: newData.compensations,
            exchanges: newData.exchanges,
            nominationLists: generateMockNominationLists(),
            possiblePlayers: newData.possiblePlayers,
            scorers: newData.scorers,
            generatedAt: Date.now(),
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
          generatedAt: Date.now(),
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
        data: { distanceInMetres?: number; correctionReason?: string },
      ) =>
        set((state) => ({
          compensations: state.compensations.map((comp) =>
            updateCompensationRecord(comp, compensationId, data),
          ),
        })),

      markGameValidated: (
        gameId: string,
        data: {
          scorer: { __identity: string; displayName: string };
          scoresheetFileId?: string;
        },
      ) =>
        set((state) => ({
          validatedGames: {
            ...state.validatedGames,
            [gameId]: {
              validatedAt: new Date().toISOString(),
              scorer: data.scorer,
              scoresheetFileId: data.scoresheetFileId,
              homeRosterClosed: true,
              awayRosterClosed: true,
            },
          },
        })),

      isGameValidated: (gameId: string) => {
        return !!get().validatedGames[gameId];
      },

      getValidatedGameData: (gameId: string) => {
        return get().validatedGames[gameId] ?? null;
      },

      updateNominationListClosed: (
        gameId: string,
        team: "home" | "away",
        closed: boolean,
      ) =>
        set((state) => {
          const gameNominations = state.nominationLists[gameId];
          if (!gameNominations) return state;

          return {
            nominationLists: {
              ...state.nominationLists,
              [gameId]: {
                ...gameNominations,
                [team]: {
                  ...gameNominations[team],
                  closed,
                  ...(closed && {
                    closedAt: new Date().toISOString(),
                    closedBy: "referee",
                  }),
                },
              },
            },
          };
        }),
    }),
    {
      name: "volleykit-demo",
      partialize: (state) => ({
        // Persist demo data arrays to preserve modifications across page refreshes
        assignments: state.assignments,
        compensations: state.compensations,
        exchanges: state.exchanges,
        nominationLists: state.nominationLists,
        possiblePlayers: state.possiblePlayers,
        scorers: state.scorers,
        validatedGames: state.validatedGames,
        activeAssociationCode: state.activeAssociationCode,
        userRefereeLevel: state.userRefereeLevel,
        userRefereeLevelGradationValue: state.userRefereeLevelGradationValue,
        generatedAt: state.generatedAt,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<DemoState> | undefined;

        // Check if persisted data is stale (older than threshold)
        const generatedAt = persistedState?.generatedAt;
        const isStale =
          !generatedAt || Date.now() - generatedAt > DEMO_DATA_STALENESS_MS;

        if (isStale) {
          // Return current (empty) state to trigger fresh data generation
          // BUT preserve validatedGames since those represent user actions
          return {
            ...current,
            validatedGames: persistedState?.validatedGames ?? {},
          };
        }

        // Data is fresh, merge persisted state
        return {
          ...current,
          ...persistedState,
        };
      },
    },
  ),
);
