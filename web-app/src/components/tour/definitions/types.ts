import type { TourId } from "@/stores/tour";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export interface TourStep {
  // Unique identifier for this step
  id: string;

  // CSS selector to highlight the target element
  targetSelector: string;

  // Translation keys for title and description
  titleKey: string;
  descriptionKey: string;

  // Where to position the tooltip relative to target
  placement: TooltipPlacement;

  // How to detect completion of this step
  completionEvent?: {
    // Type of event to listen for
    type: "click" | "swipe" | "auto";
    // Optional selector for click events (if different from target)
    selector?: string;
    // Delay in ms for "auto" type
    delay?: number;
  };
}

export interface TourDefinition {
  // The tour identifier
  id: TourId;

  // Array of steps in order
  steps: TourStep[];
}

// Dummy data types for tour mode
export interface TourDummyAssignment {
  __identity: string;
  refereePosition: string;
  refereeGame: {
    __identity: string;
    game: {
      __identity: string;
      gameNumber: string;
      startingDateTime: string;
      encounter: {
        __identity: string;
        teamHome: {
          __identity: string;
          name: string;
        };
        teamAway: {
          __identity: string;
          name: string;
        };
      };
      hall: {
        __identity: string;
        name: string;
        primaryPostalAddress: {
          __identity: string;
          city: string;
        };
      };
      // League category structure for game report eligibility
      group?: {
        __identity: string;
        phase?: {
          __identity: string;
          league?: {
            __identity: string;
            leagueCategory?: {
              __identity: string;
              name: string;
            };
          };
        };
      };
    };
    isGameInFuture: string;
  };
  convocationCompensation?: {
    __identity: string;
    distanceInMetres: number;
    distanceFormatted: string;
    // Compensation editability flags
    paymentDone?: boolean;
    lockPayoutOnSiteCompensation?: boolean;
  };
}

export interface TourDummyCompensation {
  __identity: string;
  amount: number;
  status: string;
  refereeGame: {
    __identity: string;
    game: {
      __identity: string;
      gameNumber: string;
      plannedStartDateTime: string;
      teamHome: {
        __identity: string;
        name: string;
      };
      teamAway: {
        __identity: string;
        name: string;
      };
    };
  };
  convocationCompensation?: {
    __identity: string;
    distanceInMetres: number;
    distanceFormatted: string;
    gameFee?: number;
    travelCompensation?: number;
  };
}

export interface TourDummyExchange {
  __identity: string;
  status: "open" | "applied";
  submittedAt: string;
  submittingType: string;
  refereePosition: string;
  requiredRefereeLevel: string;
  submittedByPerson: {
    __identity: string;
    firstName: string;
    lastName: string;
    displayName: string;
  };
  refereeGame: {
    __identity: string;
    game: {
      __identity: string;
      gameNumber: string;
      plannedStartDateTime: string;
      teamHome: {
        __identity: string;
        name: string;
      };
      teamAway: {
        __identity: string;
        name: string;
      };
      hall: {
        __identity: string;
        name: string;
        city: string;
      };
    };
  };
}
