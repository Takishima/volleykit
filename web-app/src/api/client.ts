import type { components } from "./schema";
import {
  assignmentsResponseSchema,
  compensationsResponseSchema,
  exchangesResponseSchema,
  validateResponse,
} from "./validation";
import { mockApi } from "./mock-api";
import {
  buildFormData,
  setCsrfToken as setToken,
  clearCsrfToken,
  getCsrfToken,
} from "./form-serialization";
import { parseErrorResponse } from "./error-handling";
import {
  ASSIGNMENT_PROPERTIES,
  EXCHANGE_PROPERTIES,
  COMPENSATION_PROPERTIES,
} from "./property-configs";
import {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_TYPES,
  DEFAULT_SEARCH_RESULTS_LIMIT,
} from "./constants";

// Base URL configuration - uses proxy URL if set, otherwise empty string for relative URLs
const API_BASE = import.meta.env.VITE_API_PROXY_URL || "";

if (!import.meta.env.DEV && !API_BASE) {
  console.warn(
    "VITE_API_PROXY_URL is not configured for production. API calls will fail.",
  );
}

// Re-export schema types
export type Schemas = components["schemas"];
export type Assignment = Schemas["Assignment"];
export type CompensationRecord = Schemas["CompensationRecord"];
export type ConvocationCompensation = Schemas["ConvocationCompensation"];
export type ConvocationCompensationDetailed = Schemas["ConvocationCompensationDetailed"];
export type GameExchange = Schemas["GameExchange"];
export type Game = Schemas["Game"];
export type Team = Schemas["Team"];
export type Hall = Schemas["Hall"];
export type RefereeGame = Schemas["RefereeGame"];
export type PersonSummary = Schemas["PersonSummary"];
export type AssociationSettings = Schemas["AssociationSettings"];
export type Season = Schemas["Season"];
export type AssignmentsResponse = Schemas["AssignmentsResponse"];
export type CompensationsResponse = Schemas["CompensationsResponse"];
export type ExchangesResponse = Schemas["ExchangesResponse"];
export type NominationList = Schemas["NominationList"];
export type IndoorPlayerNomination = Schemas["IndoorPlayerNomination"];
export type PossibleNomination = Schemas["PossibleNomination"];
export type PossibleNominationsResponse = Schemas["PossibleNominationsResponse"];
export type NominationListFinalizeResponse = Schemas["NominationListFinalizeResponse"];
export type Scoresheet = Schemas["Scoresheet"];
export type ScoresheetValidation = Schemas["ScoresheetValidation"];
export type FileResource = Schemas["FileResource"];
export type GameDetails = Schemas["GameDetails"];
export type PersonSearchResult = Schemas["PersonSearchResult"];
export type PersonSearchResponse = Schemas["PersonSearchResponse"];

export interface PersonSearchFilter {
  firstName?: string;
  lastName?: string;
  yearOfBirth?: string;
}

export interface SearchConfiguration {
  offset?: number;
  limit?: number;
  propertyFilters?: PropertyFilter[];
  propertyOrderings?: PropertyOrdering[];
}

export interface PropertyFilter {
  propertyName: string;
  values?: string[];
  enumValues?: string[];
  dateRange?: { from: string; to: string };
}

export interface PropertyOrdering {
  propertyName: string;
  descending: boolean;
  isSetByUser?: boolean;
}

// CSRF token management - re-export for external use
export function setCsrfToken(token: string | null) {
  setToken(token);
}

export function clearSession() {
  clearCsrfToken();
}

// Generic fetch wrapper
async function apiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: Record<string, unknown>,
): Promise<T> {
  let url = `${API_BASE}${endpoint}`;

  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (method === "GET" && body) {
    const params = buildFormData(body, { includeCsrfToken: false });
    url = `${url}?${params.toString()}`;
  }

  if (method !== "GET" && body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: "include",
    body: method !== "GET" && body ? buildFormData(body) : undefined,
  });

  if (!response.ok) {
    if (
      response.status === 401 ||
      response.status === 403 ||
      response.status === 406
    ) {
      clearSession();
      throw new Error("Session expired. Please log in again.");
    }
    const errorMessage = await parseErrorResponse(response);
    throw new Error(`${method} ${endpoint}: ${errorMessage}`);
  }

  try {
    return await response.json();
  } catch {
    const contentType = response.headers.get("Content-Type") || "";
    throw new Error(
      `${method} ${endpoint}: Invalid JSON response (Content-Type: ${contentType || "unknown"}, status: ${response.status})`,
    );
  }
}

// API Methods
export const api = {
  // Assignments
  async searchAssignments(
    config: SearchConfiguration = {},
  ): Promise<AssignmentsResponse> {
    const data = await apiRequest<unknown>(
      "/indoorvolleyball.refadmin/api%5crefereeconvocation/searchMyRefereeConvocations",
      "POST",
      {
        searchConfiguration: config,
        propertyRenderConfiguration: ASSIGNMENT_PROPERTIES,
      },
    );
    validateResponse(data, assignmentsResponseSchema, "searchAssignments");
    return data as AssignmentsResponse;
  },

  async getAssignmentDetails(
    convocationId: string,
    properties: string[],
  ): Promise<Assignment> {
    const query = new URLSearchParams();
    query.set("convocation", convocationId);
    properties.forEach((prop, i) =>
      query.set(`nestedPropertyNames[${i}]`, prop),
    );

    return apiRequest<Assignment>(
      `/indoorvolleyball.refadmin/api%5crefereeconvocation/showWithNestedObjects?${query}`,
    );
  },

  // Compensations
  async searchCompensations(
    config: SearchConfiguration = {},
  ): Promise<CompensationsResponse> {
    const data = await apiRequest<unknown>(
      "/indoorvolleyball.refadmin/api%5crefereeconvocationcompensation/search",
      "POST",
      {
        searchConfiguration: config,
        propertyRenderConfiguration: COMPENSATION_PROPERTIES,
      },
    );
    validateResponse(data, compensationsResponseSchema, "searchCompensations");
    return data as CompensationsResponse;
  },

  async getCompensationDetails(
    compensationId: string,
  ): Promise<ConvocationCompensationDetailed> {
    const query = new URLSearchParams();
    query.set("convocationCompensation[__identity]", compensationId);
    query.append("propertyRenderConfiguration[]", "correctionReason");
    query.append("propertyRenderConfiguration[]", "distanceInMetres");
    query.append("propertyRenderConfiguration[]", "distanceFormatted");

    return apiRequest<ConvocationCompensationDetailed>(
      `/indoorvolleyball.refadmin/api%5cconvocationcompensation/showWithNestedObjects?${query}`,
    );
  },

  async updateCompensation(
    compensationId: string,
    data: { distanceInMetres?: number; correctionReason?: string },
  ): Promise<void> {
    const requestBody: Record<string, unknown> = {
      __identity: compensationId,
    };

    if (data.distanceInMetres !== undefined) {
      requestBody["convocationCompensation"] = {
        ...(requestBody["convocationCompensation"] as object),
        distanceInMetres: data.distanceInMetres,
      };
    }

    if (data.correctionReason !== undefined) {
      requestBody["convocationCompensation"] = {
        ...(requestBody["convocationCompensation"] as object),
        correctionReason: data.correctionReason,
      };
    }

    return apiRequest(
      "/indoorvolleyball.refadmin/api%5cconvocationcompensation",
      "PUT",
      requestBody,
    );
  },

  // Game Exchanges
  async searchExchanges(
    config: SearchConfiguration = {},
  ): Promise<ExchangesResponse> {
    const data = await apiRequest<unknown>(
      "/indoorvolleyball.refadmin/api%5crefereegameexchange/search",
      "POST",
      {
        searchConfiguration: config,
        propertyRenderConfiguration: EXCHANGE_PROPERTIES,
      },
    );
    validateResponse(data, exchangesResponseSchema, "searchExchanges");
    return data as ExchangesResponse;
  },

  async applyForExchange(exchangeId: string): Promise<void> {
    return apiRequest(
      "/indoorvolleyball.refadmin/api%5crefereegameexchange",
      "PUT",
      { __identity: exchangeId, apply: "1" },
    );
  },

  async withdrawFromExchange(exchangeId: string): Promise<void> {
    return apiRequest(
      "/indoorvolleyball.refadmin/api%5crefereegameexchange",
      "PUT",
      { __identity: exchangeId, withdrawApplication: "1" },
    );
  },

  // Settings
  async getAssociationSettings(): Promise<Schemas["AssociationSettings"]> {
    return apiRequest(
      "/indoorvolleyball.refadmin/api%5crefereeassociationsettings/getRefereeAssociationSettingsOfActiveParty",
    );
  },

  async getActiveSeason(): Promise<Schemas["Season"]> {
    return apiRequest(
      "/sportmanager.indoorvolleyball/api%5cindoorseason/getActiveIndoorSeason",
    );
  },

  // Nominations
  async getPossiblePlayerNominations(
    nominationListId: string,
    options?: { onlyFromMyTeam?: boolean; onlyRelevantGender?: boolean },
  ): Promise<PossibleNominationsResponse> {
    return apiRequest(
      "/sportmanager.indoorvolleyball/api%5cnominationlist/getPossibleIndoorPlayerNominationsForNominationList",
      "POST",
      {
        nominationList: nominationListId,
        onlyFromMyTeam: options?.onlyFromMyTeam ?? true,
        onlyRelevantGender: options?.onlyRelevantGender ?? true,
      },
    );
  },

  // Person search
  async searchPersons(
    filters: PersonSearchFilter,
    options?: { offset?: number; limit?: number },
  ): Promise<PersonSearchResponse> {
    const propertyFilters: Array<{ propertyName: string; text: string }> = [];

    const { firstName, lastName, yearOfBirth } = filters;

    if (firstName && !lastName) {
      propertyFilters.push(
        { propertyName: "firstName", text: firstName },
        { propertyName: "lastName", text: firstName },
      );
    } else if (lastName && !firstName) {
      propertyFilters.push(
        { propertyName: "firstName", text: lastName },
        { propertyName: "lastName", text: lastName },
      );
    } else {
      if (firstName) {
        propertyFilters.push({ propertyName: "firstName", text: firstName });
      }
      if (lastName) {
        propertyFilters.push({ propertyName: "lastName", text: lastName });
      }
    }

    if (yearOfBirth) {
      propertyFilters.push({
        propertyName: "yearOfBirth",
        text: yearOfBirth,
      });
    }

    const searchConfig: Record<string, unknown> = {
      propertyFilters,
      offset: options?.offset ?? 0,
      limit: options?.limit ?? DEFAULT_SEARCH_RESULTS_LIMIT,
    };

    return apiRequest<PersonSearchResponse>(
      "/sportmanager.core/api%5celasticsearchperson/search",
      "GET",
      {
        searchConfiguration: searchConfig,
        propertyRenderConfiguration: [
          "displayName",
          "firstName",
          "lastName",
          "associationId",
          "birthday",
          "gender",
        ],
      },
    );
  },

  // Game details and scoresheet
  async getGameWithScoresheet(gameId: string): Promise<Schemas["GameDetails"]> {
    const properties = [
      // Scoresheet properties
      "scoresheet",
      "scoresheet.__identity",
      "scoresheet.game.__identity",
      "scoresheet.isSimpleScoresheet",
      "scoresheet.writerPerson",
      "scoresheet.file",
      "scoresheet.hasFile",
      "scoresheet.closedAt",
      "scoresheet.scoresheetValidation",
      // Home team nomination list with full player details
      "nominationListOfTeamHome",
      "nominationListOfTeamHome.__identity",
      "nominationListOfTeamHome.game.__identity",
      "nominationListOfTeamHome.team",
      "nominationListOfTeamHome.closed",
      "nominationListOfTeamHome.closedAt",
      "nominationListOfTeamHome.checked",
      "nominationListOfTeamHome.isClosedForTeam",
      "nominationListOfTeamHome.nominationListValidation",
      "nominationListOfTeamHome.indoorPlayerNominations",
      "nominationListOfTeamHome.indoorPlayerNominations.*.__identity",
      "nominationListOfTeamHome.indoorPlayerNominations.*.shirtNumber",
      "nominationListOfTeamHome.indoorPlayerNominations.*.isCaptain",
      "nominationListOfTeamHome.indoorPlayerNominations.*.isLibero",
      // Request base indoorPlayer and person before nested properties (similar to group pattern)
      "nominationListOfTeamHome.indoorPlayerNominations.*.indoorPlayer",
      "nominationListOfTeamHome.indoorPlayerNominations.*.indoorPlayer.person",
      "nominationListOfTeamHome.indoorPlayerNominations.*.indoorPlayer.person.displayName",
      "nominationListOfTeamHome.indoorPlayerNominations.*.indoorPlayer.person.firstName",
      "nominationListOfTeamHome.indoorPlayerNominations.*.indoorPlayer.person.lastName",
      "nominationListOfTeamHome.indoorPlayerNominations.*.indoorPlayerLicenseCategory",
      "nominationListOfTeamHome.indoorPlayerNominations.*.indoorPlayerLicenseCategory.shortName",
      "nominationListOfTeamHome.coachPerson",
      "nominationListOfTeamHome.firstAssistantCoachPerson",
      "nominationListOfTeamHome.secondAssistantCoachPerson",
      // Away team nomination list with full player details
      "nominationListOfTeamAway",
      "nominationListOfTeamAway.__identity",
      "nominationListOfTeamAway.game.__identity",
      "nominationListOfTeamAway.team",
      "nominationListOfTeamAway.closed",
      "nominationListOfTeamAway.closedAt",
      "nominationListOfTeamAway.checked",
      "nominationListOfTeamAway.isClosedForTeam",
      "nominationListOfTeamAway.nominationListValidation",
      "nominationListOfTeamAway.indoorPlayerNominations",
      "nominationListOfTeamAway.indoorPlayerNominations.*.__identity",
      "nominationListOfTeamAway.indoorPlayerNominations.*.shirtNumber",
      "nominationListOfTeamAway.indoorPlayerNominations.*.isCaptain",
      "nominationListOfTeamAway.indoorPlayerNominations.*.isLibero",
      // Request base indoorPlayer and person before nested properties (similar to group pattern)
      "nominationListOfTeamAway.indoorPlayerNominations.*.indoorPlayer",
      "nominationListOfTeamAway.indoorPlayerNominations.*.indoorPlayer.person",
      "nominationListOfTeamAway.indoorPlayerNominations.*.indoorPlayer.person.displayName",
      "nominationListOfTeamAway.indoorPlayerNominations.*.indoorPlayer.person.firstName",
      "nominationListOfTeamAway.indoorPlayerNominations.*.indoorPlayer.person.lastName",
      "nominationListOfTeamAway.indoorPlayerNominations.*.indoorPlayerLicenseCategory",
      "nominationListOfTeamAway.indoorPlayerNominations.*.indoorPlayerLicenseCategory.shortName",
      "nominationListOfTeamAway.coachPerson",
      "nominationListOfTeamAway.firstAssistantCoachPerson",
      "nominationListOfTeamAway.secondAssistantCoachPerson",
      // Group must be requested before nested properties to avoid 500 errors
      // when group is null (e.g., for already validated games)
      "group",
      "group.phase.league.leagueCategory.writersCanUseSimpleScoresheetForThisLeagueCategory",
    ];

    const response = await apiRequest<{ game: Schemas["GameDetails"] }>(
      "/sportmanager.indoorvolleyball/api%5cgame/showWithNestedObjects",
      "GET",
      {
        "game[__identity]": gameId,
        propertyRenderConfiguration: properties,
      },
    );

    return response.game;
  },

  async updateNominationList(
    nominationListId: string,
    gameId: string,
    teamId: string,
    playerNominationIds: string[],
  ): Promise<NominationList> {
    const body: Record<string, unknown> = {
      "nominationList[__identity]": nominationListId,
      "nominationList[game][__identity]": gameId,
      "nominationList[team][__identity]": teamId,
      "nominationList[closed]": "false",
      "nominationList[isClosedForTeam]": "true",
    };

    playerNominationIds.forEach((id, index) => {
      body[`nominationList[indoorPlayerNominations][${index}][__identity]`] = id;
    });

    return apiRequest<NominationList>(
      "/sportmanager.indoorvolleyball/api%5cnominationlist",
      "PUT",
      body,
    );
  },

  async finalizeNominationList(
    nominationListId: string,
    gameId: string,
    teamId: string,
    playerNominationIds: string[],
    validationId?: string,
  ): Promise<NominationListFinalizeResponse> {
    const body: Record<string, unknown> = {
      "nominationList[__identity]": nominationListId,
      "nominationList[game][__identity]": gameId,
      "nominationList[team][__identity]": teamId,
      "nominationList[closed]": "false",
      "nominationList[isClosedForTeam]": "true",
    };

    playerNominationIds.forEach((id, index) => {
      body[`nominationList[indoorPlayerNominations][${index}][__identity]`] = id;
    });

    if (validationId) {
      body["nominationList[nominationListValidation][__identity]"] = validationId;
    }

    return apiRequest<NominationListFinalizeResponse>(
      "/sportmanager.indoorvolleyball/api%5cnominationlist/finalize",
      "POST",
      body,
    );
  },

  async updateScoresheet(
    scoresheetId: string,
    gameId: string,
    scorerPersonId: string,
    isSimpleScoresheet: boolean = false,
  ): Promise<Scoresheet> {
    return apiRequest<Scoresheet>(
      "/sportmanager.indoorvolleyball/api%5cscoresheet",
      "PUT",
      {
        "scoresheet[__identity]": scoresheetId,
        "scoresheet[game][__identity]": gameId,
        "scoresheet[writerPerson][__identity]": scorerPersonId,
        "scoresheet[isSimpleScoresheet]": isSimpleScoresheet ? "true" : "false",
        "scoresheet[hasFile]": "false",
      },
    );
  },

  async finalizeScoresheet(
    scoresheetId: string,
    gameId: string,
    scorerPersonId: string,
    fileResourceId?: string,
    validationId?: string,
    isSimpleScoresheet: boolean = false,
  ): Promise<Scoresheet> {
    const body: Record<string, unknown> = {
      "scoresheet[__identity]": scoresheetId,
      "scoresheet[game][__identity]": gameId,
      "scoresheet[writerPerson][__identity]": scorerPersonId,
      "scoresheet[hasFile]": fileResourceId ? "true" : "false",
      "scoresheet[isSimpleScoresheet]": isSimpleScoresheet ? "true" : "false",
    };

    if (fileResourceId) {
      body["scoresheet[file][__identity]"] = fileResourceId;
    }

    if (validationId) {
      body["scoresheet[scoresheetValidation][__identity]"] = validationId;
    }

    return apiRequest<Scoresheet>(
      "/sportmanager.indoorvolleyball/api%5cscoresheet/finalize",
      "POST",
      body,
    );
  },

  async uploadResource(file: File): Promise<FileResource[]> {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(
        `Invalid file type: ${file.type || "unknown"}. Only JPEG, PNG, or PDF files are allowed.`,
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      throw new Error(`File too large: ${sizeMB} MB. Maximum size is 10 MB.`);
    }

    const formData = new FormData();
    formData.append("resource", file);
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      formData.append("__csrfToken", csrfToken);
    }

    const url = `${API_BASE}/sportmanager.resourcemanagement/api%5cpersistentresource/upload`;

    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        clearSession();
        throw new Error("Session expired. Please log in again.");
      }
      const errorMessage = await parseErrorResponse(response);
      throw new Error(`POST ${url}: ${errorMessage}`);
    }

    return response.json();
  },
};

export type ApiClient = typeof api;

export function getApiClient(isDemoMode: boolean): ApiClient {
  return isDemoMode ? mockApi : api;
}

export default api;
