import type { TourDefinition, TourDummyAssignment } from "./types";

export const assignmentsTour: TourDefinition = {
  id: "assignments",
  steps: [
    {
      id: "welcome",
      targetSelector: "[data-tour='assignment-card']",
      titleKey: "tour.assignments.welcome.title",
      descriptionKey: "tour.assignments.welcome.description",
      placement: "bottom",
      completionEvent: { type: "auto", delay: 3000 },
    },
    {
      id: "swipe-validate",
      targetSelector: "[data-tour='assignment-card']",
      titleKey: "tour.assignments.swipeValidate.title",
      descriptionKey: "tour.assignments.swipeValidate.description",
      placement: "bottom",
      completionEvent: { type: "swipe" },
    },
    {
      id: "swipe-exchange",
      targetSelector: "[data-tour='assignment-card']",
      titleKey: "tour.assignments.swipeExchange.title",
      descriptionKey: "tour.assignments.swipeExchange.description",
      placement: "bottom",
      completionEvent: { type: "swipe" },
    },
    {
      id: "tap-details",
      targetSelector: "[data-tour='assignment-card']",
      titleKey: "tour.assignments.tapDetails.title",
      descriptionKey: "tour.assignments.tapDetails.description",
      placement: "bottom",
      completionEvent: { type: "click" },
    },
  ],
};

// Generate a date in the near future for the dummy assignment
function getUpcomingDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  date.setHours(14, 0, 0, 0);
  return date.toISOString();
}

/**
 * Tour dummy assignment configured to showcase ALL available action buttons:
 * - Validate: requires refereePosition === "head-one" ✓
 * - Edit Compensation: requires !paymentDone && !lockPayoutOnSiteCompensation ✓
 * - Hall Report: requires NLA/NLB league + head-one position ✓
 * - Exchange: requires isGameInFuture === "1" ✓
 */
export const TOUR_DUMMY_ASSIGNMENT: TourDummyAssignment = {
  __identity: "tour-dummy-assignment",
  refereePosition: "head-one",
  refereeGame: {
    __identity: "tour-dummy-referee-game",
    game: {
      __identity: "tour-dummy-game",
      gameNumber: "12345",
      plannedStartDateTime: getUpcomingDate(),
      teamHome: {
        __identity: "tour-dummy-team-home",
        name: "VBC Beispiel",
      },
      teamAway: {
        __identity: "tour-dummy-team-away",
        name: "SC Muster",
      },
      hall: {
        __identity: "tour-dummy-hall",
        name: "Musterhalle",
        city: "Zürich",
      },
      // NLA league category to enable hall report generation
      group: {
        __identity: "tour-dummy-group",
        phase: {
          __identity: "tour-dummy-phase",
          league: {
            __identity: "tour-dummy-league",
            leagueCategory: {
              __identity: "tour-dummy-league-category",
              name: "NLA",
            },
          },
        },
      },
    },
    isGameInFuture: "1",
  },
  convocationCompensation: {
    __identity: "tour-dummy-compensation",
    distanceInMetres: 25000,
    distanceFormatted: "25 km",
    // Compensation is editable (not paid, not locked)
    paymentDone: false,
    lockPayoutOnSiteCompensation: false,
  },
};
