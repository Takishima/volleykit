import type { TourDefinition, TourDummyCompensation } from "./types";

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
  date.setDate(date.getDate() - 7);
  date.setHours(19, 30, 0, 0);
  return date.toISOString();
}

export const TOUR_DUMMY_COMPENSATION: TourDummyCompensation = {
  __identity: "tour-dummy-compensation-record",
  amount: 85,
  status: "pending",
  refereeGame: {
    __identity: "tour-dummy-referee-game-comp",
    game: {
      __identity: "tour-dummy-game-comp",
      gameNumber: "54321",
      plannedStartDateTime: getPastDate(),
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
  convocationCompensation: {
    __identity: "tour-dummy-conv-comp",
    distanceInMetres: 30000,
    distanceFormatted: "30 km",
    gameFee: 55,
    travelCompensation: 30,
  },
};
