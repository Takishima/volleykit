import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { GameExchange } from '@/api/client'

import { ExchangeCard } from './ExchangeCard'

// Mock dependencies
vi.mock('@/features/auth/hooks/useActiveAssociation', () => ({
  useActiveAssociationCode: () => 'SV',
}))

vi.mock('@/shared/stores/settings', () => ({
  useSettingsStore: vi.fn((selector) =>
    selector({
      isTransportEnabledForAssociation: () => true,
    })
  ),
}))

vi.mock('@/shared/hooks/useSbbUrl', () => ({
  useSbbUrl: vi.fn(() => ({
    isLoading: false,
    openSbbConnection: vi.fn(),
  })),
}))

vi.mock('@/shared/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.tbd': 'TBD',
        'common.vs': 'vs',
        'common.men': 'Men',
        'common.women': 'Women',
        'common.position': 'Position',
        'common.distanceUnit': 'km',
        'positions.head-one': '1st Referee',
        'positions.head-two': '2nd Referee',
        'positions.linesman-one': '1st Linesman',
        'positions.linesman-two': '2nd Linesman',
        'positions.first-head': '1st Head',
        'assignments.openInGoogleMaps': 'Open in Google Maps',
        'assignments.openSbbConnection': 'Open SBB connection',
        'assignments.openAddressInMaps': 'Open address in maps',
        'exchange.levelRequired': 'Level required: {level}',
      }
      return translations[key] || key
    },
    tInterpolate: (key: string, values: Record<string, string | number>) => {
      let result = key
      if (key === 'exchange.levelRequired') result = `Level required: ${values.level}`
      if (key === 'assignments.openAddressInMaps') result = `Open ${values.address} in maps`
      return result
    },
    locale: 'en',
  }),
}))

vi.mock('@/shared/hooks/useDateFormat', () => ({
  useDateLocale: () => undefined, // Use default date-fns locale
}))

const createMockExchange = (overrides: Partial<GameExchange> = {}): GameExchange => ({
  __identity: 'exchange-1',
  status: 'open',
  refereePosition: 'head-one',
  requiredRefereeLevel: 'N3',
  submittedAt: '2024-03-10T10:00:00Z',
  submittingType: 'referee',
  submittedByPerson: {
    __identity: 'person-1',
    firstName: 'John',
    lastName: 'Doe',
  },
  refereeGame: {
    __identity: 'referee-game-1',
    activeFirstHeadRefereeName: 'John Doe',
    activeSecondHeadRefereeName: 'Jane Smith',
    game: {
      __identity: 'game-1',
      startingDateTime: '2024-03-15T14:00:00Z',
      hall: {
        __identity: 'hall-1',
        name: 'Sports Hall A',
        primaryPostalAddress: {
          street: '123 Main St',
          city: 'Zurich',
          postalCode: '8000',
          geographicalLocation: {
            latitude: 47.3769,
            longitude: 8.5417,
            plusCode: '8FVC9G8F+2X', // Plus code for Google Maps URL
          },
        },
      },
      encounter: {
        teamHome: { name: 'Team Alpha' },
        teamAway: { name: 'Team Beta' },
      },
      group: {
        phase: {
          league: {
            leagueCategory: { name: 'National League' },
            gender: 'm',
          },
        },
      },
    },
  },
  ...overrides,
})

describe('ExchangeCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('compact view', () => {
    it('renders date and time when startDate exists', () => {
      const exchange = createMockExchange()
      render(<ExchangeCard exchange={exchange} />)

      expect(screen.getByText('14:00')).toBeInTheDocument()
    })

    it('renders TBD when no start date', () => {
      const exchange = createMockExchange({
        refereeGame: {
          ...createMockExchange().refereeGame!,
          game: {
            ...createMockExchange().refereeGame!.game!,
            startingDateTime: undefined,
          },
        },
      })
      render(<ExchangeCard exchange={exchange} />)

      expect(screen.getByText('TBD')).toBeInTheDocument()
    })

    it('renders league category when present', () => {
      const exchange = createMockExchange()
      render(<ExchangeCard exchange={exchange} />)

      expect(screen.getByText('National League')).toBeInTheDocument()
    })

    it('renders male icon for male gender', () => {
      const exchange = createMockExchange()
      render(<ExchangeCard exchange={exchange} />)

      expect(screen.getByLabelText('Men')).toBeInTheDocument()
    })

    it('renders female icon for female gender', () => {
      const exchange = createMockExchange({
        refereeGame: {
          ...createMockExchange().refereeGame!,
          game: {
            ...createMockExchange().refereeGame!.game!,
            group: {
              phase: {
                league: {
                  leagueCategory: { name: 'National League' },
                  gender: 'f',
                },
              },
            },
          },
        },
      })
      render(<ExchangeCard exchange={exchange} />)

      expect(screen.getByLabelText('Women')).toBeInTheDocument()
    })

    it('does not render gender icon when gender is not m or f', () => {
      const exchange = createMockExchange({
        refereeGame: {
          ...createMockExchange().refereeGame!,
          game: {
            ...createMockExchange().refereeGame!.game!,
            group: {
              phase: {
                league: {
                  leagueCategory: { name: 'National League' },
                  gender: undefined,
                },
              },
            },
          },
        },
      })
      render(<ExchangeCard exchange={exchange} />)

      expect(screen.queryByLabelText('Men')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Women')).not.toBeInTheDocument()
    })

    it('renders team names', () => {
      const exchange = createMockExchange()
      render(<ExchangeCard exchange={exchange} />)

      expect(screen.getByText(/Team Alpha/)).toBeInTheDocument()
      expect(screen.getByText(/Team Beta/)).toBeInTheDocument()
    })

    it('renders TBD for missing team names', () => {
      const exchange = createMockExchange({
        refereeGame: {
          ...createMockExchange().refereeGame!,
          game: {
            ...createMockExchange().refereeGame!.game!,
            encounter: undefined,
          },
        },
      })
      render(<ExchangeCard exchange={exchange} />)

      // Should show "TBD vs TBD" - text split across elements
      expect(screen.getByText(/TBD.*vs.*TBD/)).toBeInTheDocument()
    })

    it('renders car distance badge when carDistanceKm is provided', () => {
      const exchange = createMockExchange()
      render(<ExchangeCard exchange={exchange} carDistanceKm={25.7} />)

      expect(screen.getByText(/~26/)).toBeInTheDocument()
      expect(screen.getByText(/km/)).toBeInTheDocument()
    })

    it('does not render car distance badge when carDistanceKm is null', () => {
      const exchange = createMockExchange()
      render(<ExchangeCard exchange={exchange} carDistanceKm={null} />)

      expect(screen.queryByText(/~\d+ km/)).not.toBeInTheDocument()
    })

    it('renders travel time badge when travelTimeMinutes is provided', () => {
      const exchange = createMockExchange()
      render(<ExchangeCard exchange={exchange} travelTimeMinutes={45} />)

      // TravelTimeBadge is rendered
      expect(screen.getByText(/45/)).toBeInTheDocument()
    })

    it('renders loading state for travel time', () => {
      const exchange = createMockExchange()
      render(<ExchangeCard exchange={exchange} travelTimeLoading={true} />)

      // Should render without travel time value when loading
      // The TravelTimeBadge component handles the loading indicator internally
      expect(screen.queryByText(/min/)).not.toBeInTheDocument()
    })
  })

  describe('expanded details', () => {
    // Helper to get the main expandable card button
    const getExpandButton = () => screen.getByRole('button', { expanded: false })

    it('renders hall name in details', async () => {
      const user = userEvent.setup()
      const exchange = createMockExchange()
      render(<ExchangeCard exchange={exchange} />)

      // Click to expand
      await user.click(getExpandButton())

      expect(screen.getByText('Sports Hall A')).toBeInTheDocument()
    })

    it('renders full address as link when maps URL available', async () => {
      const user = userEvent.setup()
      const exchange = createMockExchange()
      render(<ExchangeCard exchange={exchange} />)

      await user.click(getExpandButton())

      const addressLink = screen.getByRole('link', { name: /Open.*in maps/i })
      expect(addressLink).toBeInTheDocument()
    })

    it('renders Google Maps navigation button', async () => {
      const user = userEvent.setup()
      const exchange = createMockExchange()
      render(<ExchangeCard exchange={exchange} />)

      await user.click(getExpandButton())

      // Check for navigation link (Google Maps)
      expect(screen.getByLabelText('Open in Google Maps')).toBeInTheDocument()
    })

    it('renders SBB button when transport is enabled', async () => {
      const user = userEvent.setup()
      const exchange = createMockExchange()
      render(<ExchangeCard exchange={exchange} />)

      await user.click(getExpandButton())

      expect(screen.getByTitle('Open SBB connection')).toBeInTheDocument()
    })

    it('renders position label when available', async () => {
      const user = userEvent.setup()
      const exchange = createMockExchange()
      render(<ExchangeCard exchange={exchange} />)

      await user.click(getExpandButton())

      expect(screen.getByText('Position:')).toBeInTheDocument()
    })

    it('renders required level when available', async () => {
      const user = userEvent.setup()
      const exchange = createMockExchange()
      render(<ExchangeCard exchange={exchange} />)

      await user.click(getExpandButton())

      expect(screen.getByText(/Level required: N3/)).toBeInTheDocument()
    })

    it('does not render required level when not set', async () => {
      const user = userEvent.setup()
      const exchange = createMockExchange({ requiredRefereeLevel: undefined })
      render(<ExchangeCard exchange={exchange} />)

      await user.click(getExpandButton())

      expect(screen.queryByText(/Level required/)).not.toBeInTheDocument()
    })

    it('renders role assignments', async () => {
      const user = userEvent.setup()
      const exchange = createMockExchange()
      render(<ExchangeCard exchange={exchange} />)

      await user.click(getExpandButton())

      expect(screen.getByText('1st Referee:')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('highlights submitter name in role assignments', async () => {
      const user = userEvent.setup()
      const exchange = createMockExchange()
      render(<ExchangeCard exchange={exchange} />)

      await user.click(getExpandButton())

      // The submitter (John Doe) should have italic styling
      const johnDoe = screen.getByText('John Doe')
      expect(johnDoe).toHaveClass('italic')
    })

    it('does not render role assignments when none exist', async () => {
      const user = userEvent.setup()
      const exchange = createMockExchange({
        refereeGame: {
          ...createMockExchange().refereeGame!,
          activeFirstHeadRefereeName: undefined,
          activeSecondHeadRefereeName: undefined,
        },
      })
      render(<ExchangeCard exchange={exchange} />)

      await user.click(getExpandButton())

      expect(screen.queryByText('1st Referee:')).not.toBeInTheDocument()
    })
  })

  describe('disabled expansion', () => {
    it('does not expand when disableExpansion is true', async () => {
      const user = userEvent.setup()
      const exchange = createMockExchange()
      render(<ExchangeCard exchange={exchange} disableExpansion />)

      // When expansion is disabled, the button still exists but clicking doesn't expand
      const button = screen.getByRole('button', { expanded: false })
      await user.click(button)

      // Button should still show as not expanded after click
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('data-tour attribute', () => {
    it('passes dataTour prop to ExpandableCard', () => {
      const exchange = createMockExchange()
      render(<ExchangeCard exchange={exchange} dataTour="exchange-card-tour" />)

      // Find the card element with data-tour attribute
      const cardWithTour = document.querySelector('[data-tour="exchange-card-tour"]')
      expect(cardWithTour).toBeInTheDocument()
    })
  })
})
