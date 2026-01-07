import type { TourDefinition, TourDummyCompensation } from "@/shared/components/tour/definitions/types";

// Tour dummy data configuration
const TOUR_DAYS_PAST = 7;
const TOUR_GAME_HOUR = 19;
const TOUR_GAME_MINUTE = 30;

export const compensationsTour: TourDefinition = {
  id: "compensations",
  steps: [
    {
      id: "overview",
      targetSelector: "[data-tour='compensation-card']",
      titleKey: "tour.compensations.overview.title",
      descriptionKey: "tour.compensations.overview.description",
      placement: "bottom",
      completionEvent: { type: "auto", delay: 3000 },
    },
    {
      id: "swipe-edit",
      targetSelector: "[data-tour='compensation-card']",
      titleKey: "tour.compensations.swipeEdit.title",
      descriptionKey: "tour.compensations.swipeEdit.description",
      placement: "bottom",
      completionEvent: { type: "swipe" },
      autoSwipe: { direction: "left" },
    },
    {
      id: "tap-details",
      targetSelector: "[data-tour='compensation-card']",
      titleKey: "tour.compensations.tapDetails.title",
      descriptionKey: "tour.compensations.tapDetails.description",
      placement: "bottom",
      completionEvent: { type: "click" },
    },
  ],
};

// Generate a past date for the dummy compensation
function getPastDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - TOUR_DAYS_PAST);
  date.setHours(TOUR_GAME_HOUR, TOUR_GAME_MINUTE, 0, 0);
  return date.toISOString();
}

export const TOUR_DUMMY_COMPENSATION: TourDummyCompensation = {
  __identity: "tour-dummy-compensation-record",
  amount: 85,
  status: "pending",
  refereePosition: "head-one",
  refereeGame: {
    __identity: "tour-dummy-referee-game-comp",
    game: {
      __identity: "tour-dummy-game-comp",
      number: "54321",
      startingDateTime: getPastDate(),
      encounter: {
        __identity: "tour-dummy-encounter-comp",
        teamHome: {
          __identity: "tour-dummy-team-home-comp",
          name: "TV Demo",
        },
        teamAway: {
          __identity: "tour-dummy-team-away-comp",
          name: "BC Tutorial",
        },
      },
    },
  },
  convocationCompensation: {
    __identity: "tour-dummy-conv-comp",
    distanceInMetres: 30000,
    distanceFormatted: "30 km",
    gameCompensation: 55,
    travelExpenses: 30,
    paymentDone: false,
  },
};
