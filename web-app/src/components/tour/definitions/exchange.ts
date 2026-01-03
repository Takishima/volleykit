import type { TourDefinition, TourDummyExchange } from "./types";

export const exchangeTour: TourDefinition = {
  id: "exchange",
  steps: [
    {
      id: "browse",
      targetSelector: "[data-tour='exchange-card']",
      titleKey: "tour.exchange.browse.title",
      descriptionKey: "tour.exchange.browse.description",
      placement: "bottom",
      completionEvent: { type: "auto", delay: 3000 },
    },
    {
      id: "apply",
      targetSelector: "[data-tour='exchange-card']",
      titleKey: "tour.exchange.apply.title",
      descriptionKey: "tour.exchange.apply.description",
      placement: "bottom",
      completionEvent: { type: "swipe" },
    },
    {
      id: "filters",
      targetSelector: "[data-tour='exchange-settings']",
      titleKey: "tour.exchange.filters.title",
      descriptionKey: "tour.exchange.filters.description",
      placement: "bottom",
      completionEvent: { type: "click" },
    },
  ],
};

// Generate a future date for the exchange
function getFutureDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 10);
  date.setHours(16, 0, 0, 0);
  return date.toISOString();
}

export const TOUR_DUMMY_EXCHANGE: TourDummyExchange = {
  __identity: "tour-dummy-exchange",
  status: "open",
  submittedAt: new Date().toISOString(),
  submittingType: "referee",
  refereePosition: "head-one",
  requiredRefereeLevel: "N3",
  submittedByPerson: {
    __identity: "tour-dummy-submitter",
    firstName: "Max",
    lastName: "Mustermann",
    displayName: "Max Mustermann",
  },
  refereeGame: {
    __identity: "tour-dummy-referee-game-exchange",
    game: {
      __identity: "tour-dummy-game-exchange",
      gameNumber: "67890",
      startingDateTime: getFutureDate(),
      encounter: {
        __identity: "tour-dummy-encounter-exchange",
        teamHome: {
          __identity: "tour-dummy-team-home-exchange",
          name: "VBC Anleitung",
        },
        teamAway: {
          __identity: "tour-dummy-team-away-exchange",
          name: "SC Hilfe",
        },
      },
      hall: {
        __identity: "tour-dummy-hall-exchange",
        name: "Turnhalle Tutorial",
        primaryPostalAddress: {
          __identity: "tour-dummy-address-exchange",
          city: "Bern",
        },
      },
    },
  },
};
