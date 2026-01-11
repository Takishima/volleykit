import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useTourStore } from '@/shared/stores/tour'

import { TourProvider } from './TourProvider'

import type { TourDefinition } from './definitions/types'

// Mock tour definitions
const mockTourDefinition: TourDefinition = {
  id: 'assignments',
  steps: [
    {
      id: 'step-1',
      targetSelector: '.step-1-target',
      titleKey: 'tour.step1.title',
      descriptionKey: 'tour.step1.description',
      placement: 'bottom',
    },
    {
      id: 'step-2',
      targetSelector: '.step-2-target',
      titleKey: 'tour.step2.title',
      descriptionKey: 'tour.step2.description',
      placement: 'top',
      completionEvent: { type: 'click' },
    },
    {
      id: 'step-3',
      targetSelector: '.step-3-target',
      titleKey: 'tour.step3.title',
      descriptionKey: 'tour.step3.description',
      placement: 'right',
      completionEvent: { type: 'auto', delay: 1000 },
    },
  ],
}

vi.mock('./definitions', () => ({
  getTourDefinition: vi.fn(() => mockTourDefinition),
  getTourStepCount: vi.fn(() => 3),
}))

// Mock the spotlight and tooltip to simplify testing
vi.mock('./TourSpotlight', () => ({
  TourSpotlight: ({
    children,
    onDismiss,
  }: {
    children: React.ReactNode
    onDismiss: () => void
  }) => (
    <div data-testid="tour-spotlight">
      <button onClick={onDismiss} data-testid="dismiss-button">
        Dismiss
      </button>
      {children}
    </div>
  ),
}))

vi.mock('./TourTooltip', () => ({
  TourTooltip: ({
    titleKey,
    onNext,
    onPrevious,
    onSkip,
    isFirstStep,
    isLastStep,
    currentStep,
    totalSteps,
  }: {
    titleKey: string
    onNext?: () => void
    onPrevious?: () => void
    onSkip: () => void
    isFirstStep: boolean
    isLastStep: boolean
    currentStep: number
    totalSteps: number
  }) => (
    <div data-testid="tour-tooltip">
      <span data-testid="step-title">{titleKey}</span>
      <span data-testid="step-info">
        {currentStep + 1}/{totalSteps}
      </span>
      {onPrevious && !isFirstStep && (
        <button onClick={onPrevious} data-testid="prev-button">
          Previous
        </button>
      )}
      {onNext && (
        <button onClick={onNext} data-testid="next-button">
          {isLastStep ? 'Finish' : 'Next'}
        </button>
      )}
      <button onClick={onSkip} data-testid="skip-button">
        Skip
      </button>
    </div>
  ),
}))

describe('TourProvider', () => {
  let targetElement: HTMLDivElement

  beforeEach(() => {
    // Reset the store before each test
    useTourStore.setState({
      activeTour: null,
      currentStep: 0,
      completedTours: [],
      dismissedTours: [],
    })

    // Create target elements
    targetElement = document.createElement('div')
    targetElement.className = 'step-1-target'
    document.body.appendChild(targetElement)

    vi.useFakeTimers()
  })

  afterEach(() => {
    document.body.removeChild(targetElement)
    vi.useRealTimers()
  })

  it('renders children when no tour is active', () => {
    render(
      <TourProvider>
        <div data-testid="child-content">App Content</div>
      </TourProvider>
    )

    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.queryByTestId('tour-spotlight')).not.toBeInTheDocument()
  })

  it('renders tour UI when tour is active', () => {
    useTourStore.getState().startTour('assignments')

    render(
      <TourProvider>
        <div data-testid="child-content">App Content</div>
      </TourProvider>
    )

    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByTestId('tour-spotlight')).toBeInTheDocument()
    expect(screen.getByTestId('tour-tooltip')).toBeInTheDocument()
  })

  it('provides onNext callback to tooltip', async () => {
    useTourStore.getState().startTour('assignments')

    render(
      <TourProvider>
        <div>Content</div>
      </TourProvider>
    )

    // The next button should be rendered by our mocked TourTooltip
    expect(screen.getByTestId('next-button')).toBeInTheDocument()
    expect(screen.getByTestId('step-info')).toHaveTextContent('1/3')
  })

  it('provides onPrevious callback when not on first step', () => {
    useTourStore.setState({ activeTour: 'assignments', currentStep: 1 })

    render(
      <TourProvider>
        <div>Content</div>
      </TourProvider>
    )

    // Previous button should be available on non-first step
    expect(screen.getByTestId('prev-button')).toBeInTheDocument()
    expect(screen.getByTestId('step-info')).toHaveTextContent('2/3')
  })

  it('does not show previous button on first step', () => {
    useTourStore.getState().startTour('assignments')

    render(
      <TourProvider>
        <div>Content</div>
      </TourProvider>
    )

    expect(screen.queryByTestId('prev-button')).not.toBeInTheDocument()
  })

  it('provides skip button on tooltip', () => {
    useTourStore.getState().startTour('assignments')

    render(
      <TourProvider>
        <div>Content</div>
      </TourProvider>
    )

    expect(screen.getByTestId('skip-button')).toBeInTheDocument()
  })

  it('shows Finish button on last step', () => {
    useTourStore.setState({ activeTour: 'assignments', currentStep: 2 })

    render(
      <TourProvider>
        <div>Content</div>
      </TourProvider>
    )

    expect(screen.getByTestId('next-button')).toHaveTextContent('Finish')
    expect(screen.getByTestId('step-info')).toHaveTextContent('3/3')
  })

  it('clears auto-advance timer on unmount', () => {
    useTourStore.setState({ activeTour: 'assignments', currentStep: 2 })
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    const { unmount } = render(
      <TourProvider>
        <div>Content</div>
      </TourProvider>
    )

    unmount()

    // Timer should be cleared
    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })

  it('displays correct title key for current step', () => {
    useTourStore.setState({ activeTour: 'assignments', currentStep: 0 })

    render(
      <TourProvider>
        <div>Content</div>
      </TourProvider>
    )

    expect(screen.getByTestId('step-title')).toHaveTextContent('tour.step1.title')
  })

  it('provides dismiss callback via spotlight', () => {
    useTourStore.getState().startTour('assignments')

    render(
      <TourProvider>
        <div>Content</div>
      </TourProvider>
    )

    // The dismiss button is provided by the mocked spotlight
    expect(screen.getByTestId('dismiss-button')).toBeInTheDocument()
  })
})
