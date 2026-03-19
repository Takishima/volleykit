import type {
  TourDefinition,
  TourDummyAssignment,
} from '@/shared/components/tour/definitions/types'

// Tour dummy data configuration
const TOUR_DAYS_AHEAD = 3
const TOUR_GAME_HOUR = 14

export const assignmentsTour: TourDefinition = {
  id: 'assignments',
  steps: [
    {
      id: 'welcome',
      targetSelector: "[data-tour='assignment-card']",
      titleKey: 'tour.assignments.welcome.title',
      descriptionKey: 'tour.assignments.welcome.description',
      placement: 'bottom',
    },
    {
      id: 'swipe-validate',
      targetSelector: "[data-tour='assignment-card']",
      titleKey: 'tour.assignments.swipeValidate.title',
      descriptionKey: 'tour.assignments.swipeValidate.description',
      placement: 'bottom',
      autoSwipe: { direction: 'left' },
    },
    {
      id: 'swipe-exchange',
      targetSelector: "[data-tour='assignment-card']",
      titleKey: 'tour.assignments.swipeExchange.title',
      descriptionKey: 'tour.assignments.swipeExchange.description',
      placement: 'bottom',
      autoSwipe: { direction: 'right' },
    },
    {
      id: 'tap-details',
      targetSelector: "[data-tour='assignment-card']",
      titleKey: 'tour.assignments.tapDetails.title',
      descriptionKey: 'tour.assignments.tapDetails.description',
      placement: 'bottom',
    },
  ],
}

// Generate a date in the near future for the dummy assignment
function getUpcomingDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + TOUR_DAYS_AHEAD)
  date.setHours(TOUR_GAME_HOUR, 0, 0, 0)
  return date.toISOString()
}

// Configured to pass all eligibility checks so all action buttons are visible during the tour
// - refereePosition: "head-one" = 1st referee (enables validate game action)
// - leagueCategory: "NLA" = top league (enables hall report generation)
export const TOUR_DUMMY_ASSIGNMENT: TourDummyAssignment = {
  __identity: 'tour-dummy-assignment',
  refereePosition: 'head-one',
  refereeGame: {
    __identity: 'tour-dummy-referee-game',
    game: {
      __identity: 'tour-dummy-game',
      gameNumber: '12345',
      startingDateTime: getUpcomingDate(),
      encounter: {
        __identity: 'tour-dummy-encounter',
        teamHome: {
          __identity: 'tour-dummy-team-home',
          name: 'VBC Beispiel',
        },
        teamAway: {
          __identity: 'tour-dummy-team-away',
          name: 'SC Muster',
        },
      },
      hall: {
        __identity: 'tour-dummy-hall',
        name: 'Musterhalle',
        primaryPostalAddress: {
          __identity: 'tour-dummy-address',
          city: 'Zürich',
        },
      },
      // NLA league category to enable hall report generation
      group: {
        __identity: 'tour-dummy-group',
        phase: {
          __identity: 'tour-dummy-phase',
          league: {
            __identity: 'tour-dummy-league',
            leagueCategory: {
              __identity: 'tour-dummy-league-category',
              name: 'NLA',
            },
          },
        },
      },
    },
    isGameInFuture: '1',
  },
  convocationCompensation: {
    __identity: 'tour-dummy-compensation',
    distanceInMetres: 25000,
    distanceFormatted: '25 km',
    // Compensation is editable (not paid, not locked)
    paymentDone: false,
    lockPayoutOnSiteCompensation: false,
  },
}
