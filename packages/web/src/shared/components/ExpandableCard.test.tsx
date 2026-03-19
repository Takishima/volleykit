import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { ExpandableCard } from './ExpandableCard'

interface TestData {
  id: string
  title: string
  description: string
}

const mockData: TestData = {
  id: 'test-1',
  title: 'Test Title',
  description: 'Test Description',
}

describe('ExpandableCard', () => {
  describe('rendering', () => {
    it('renders compact view content', () => {
      render(
        <ExpandableCard
          data={mockData}
          renderCompact={(data) => <span>{data.title}</span>}
          renderDetails={(data) => <span>{data.description}</span>}
        />
      )

      expect(screen.getByText('Test Title')).toBeInTheDocument()
    })

    it('renders details content when expanded', () => {
      render(
        <ExpandableCard
          data={mockData}
          renderCompact={(data) => <span>{data.title}</span>}
          renderDetails={(data) => <span>{data.description}</span>}
        />
      )

      // Initially the details are in the DOM but collapsed
      expect(screen.getByText('Test Description')).toBeInTheDocument()

      // Expand
      fireEvent.click(screen.getByRole('button'))

      // Details should still be visible
      expect(screen.getByText('Test Description')).toBeInTheDocument()
    })

    it('applies custom className to Card wrapper', () => {
      const { container } = render(
        <ExpandableCard
          data={mockData}
          className="custom-class"
          renderCompact={(data) => <span>{data.title}</span>}
          renderDetails={(data) => <span>{data.description}</span>}
        />
      )

      // The Card wrapper should have the custom class
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('expand/collapse behavior', () => {
    it('starts collapsed (aria-expanded=false)', () => {
      render(
        <ExpandableCard
          data={mockData}
          renderCompact={(data) => <span>{data.title}</span>}
          renderDetails={(data) => <span>{data.description}</span>}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })

    it('expands on click (aria-expanded=true)', () => {
      render(
        <ExpandableCard
          data={mockData}
          renderCompact={(data) => <span>{data.title}</span>}
          renderDetails={(data) => <span>{data.description}</span>}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(button).toHaveAttribute('aria-expanded', 'true')
    })

    it('collapses on second click', () => {
      render(
        <ExpandableCard
          data={mockData}
          renderCompact={(data) => <span>{data.title}</span>}
          renderDetails={(data) => <span>{data.description}</span>}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button) // expand
      fireEvent.click(button) // collapse

      expect(button).toHaveAttribute('aria-expanded', 'false')
    })

    it('passes isExpanded to renderCompact', () => {
      const renderCompact = vi.fn((_data: TestData, { isExpanded }: { isExpanded: boolean }) => (
        <span>{isExpanded ? 'Expanded' : 'Collapsed'}</span>
      ))

      render(
        <ExpandableCard
          data={mockData}
          renderCompact={renderCompact}
          renderDetails={() => <span>Details</span>}
        />
      )

      expect(screen.getByText('Collapsed')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button'))

      expect(screen.getByText('Expanded')).toBeInTheDocument()
    })
  })

  describe('disabled expansion', () => {
    it('hides expand arrow when disableExpansion is true', () => {
      const renderCompact = vi.fn(
        (_data: TestData, { expandArrow }: { expandArrow: React.ReactNode }) => (
          <>
            <span>Title</span>
            {expandArrow}
          </>
        )
      )

      render(
        <ExpandableCard
          data={mockData}
          disableExpansion
          renderCompact={renderCompact}
          renderDetails={() => <span>Details</span>}
        />
      )

      // expandArrow should be null when disabled
      expect(renderCompact).toHaveBeenCalledWith(
        mockData,
        expect.objectContaining({ expandArrow: null })
      )
    })

    it('provides expand arrow when disableExpansion is false', () => {
      const renderCompact = vi.fn(
        (_data: TestData, { expandArrow }: { expandArrow: React.ReactNode }) => (
          <>
            <span>Title</span>
            {expandArrow}
          </>
        )
      )

      render(
        <ExpandableCard
          data={mockData}
          disableExpansion={false}
          renderCompact={renderCompact}
          renderDetails={() => <span>Details</span>}
        />
      )

      // expandArrow should not be null
      expect(renderCompact).toHaveBeenCalledWith(
        mockData,
        expect.objectContaining({
          expandArrow: expect.not.objectContaining({ type: null }),
        })
      )
    })

    it('does not toggle when disableExpansion is true', () => {
      render(
        <ExpandableCard
          data={mockData}
          disableExpansion
          renderCompact={(data) => <span>{data.title}</span>}
          renderDetails={(data) => <span>{data.description}</span>}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(button)

      // Should remain collapsed
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('onClick callback', () => {
    it('calls onClick instead of toggling when provided', () => {
      const onClick = vi.fn()

      render(
        <ExpandableCard
          data={mockData}
          onClick={onClick}
          renderCompact={(data) => <span>{data.title}</span>}
          renderDetails={(data) => <span>{data.description}</span>}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onClick).toHaveBeenCalledTimes(1)
      // Should not expand when onClick is provided
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('accessibility', () => {
    it('uses native button element', () => {
      render(
        <ExpandableCard
          data={mockData}
          renderCompact={(data) => <span>{data.title}</span>}
          renderDetails={(data) => <span>{data.description}</span>}
        />
      )

      const button = screen.getByRole('button')
      expect(button.tagName).toBe('BUTTON')
      expect(button).toHaveAttribute('type', 'button')
    })

    it('has aria-controls linking to details section', () => {
      const { container } = render(
        <ExpandableCard
          data={mockData}
          renderCompact={(data) => <span>{data.title}</span>}
          renderDetails={(data) => <span>{data.description}</span>}
        />
      )

      const button = screen.getByRole('button')
      const controlsId = button.getAttribute('aria-controls')

      expect(controlsId).toBeTruthy()

      // The controlled element should exist
      const detailsSection = container.querySelector(`#${CSS.escape(controlsId!)}`)
      expect(detailsSection).toBeInTheDocument()
    })

    it('has focus ring styles', () => {
      render(
        <ExpandableCard
          data={mockData}
          renderCompact={(data) => <span>{data.title}</span>}
          renderDetails={(data) => <span>{data.description}</span>}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus:ring-2')
      expect(button).toHaveClass('focus:ring-primary-500')
    })
  })

  describe('animation', () => {
    it('has CSS Grid transition classes', () => {
      const { container } = render(
        <ExpandableCard
          data={mockData}
          renderCompact={(data) => <span>{data.title}</span>}
          renderDetails={(data) => <span>{data.description}</span>}
        />
      )

      const button = screen.getByRole('button')
      const detailsId = button.getAttribute('aria-controls')
      const detailsSection = container.querySelector(`#${CSS.escape(detailsId!)}`)

      expect(detailsSection).toHaveClass('grid')
      expect(detailsSection).toHaveClass('transition-[grid-template-rows]')
      expect(detailsSection).toHaveClass('duration-200')
    })

    it('uses grid-rows-[0fr] when collapsed', () => {
      const { container } = render(
        <ExpandableCard
          data={mockData}
          renderCompact={(data) => <span>{data.title}</span>}
          renderDetails={(data) => <span>{data.description}</span>}
        />
      )

      const button = screen.getByRole('button')
      const detailsId = button.getAttribute('aria-controls')
      const detailsSection = container.querySelector(`#${CSS.escape(detailsId!)}`)

      expect(detailsSection).toHaveClass('grid-rows-[0fr]')
    })

    it('uses grid-rows-[1fr] when expanded', () => {
      const { container } = render(
        <ExpandableCard
          data={mockData}
          renderCompact={(data) => <span>{data.title}</span>}
          renderDetails={(data) => <span>{data.description}</span>}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      const detailsId = button.getAttribute('aria-controls')
      const detailsSection = container.querySelector(`#${CSS.escape(detailsId!)}`)

      expect(detailsSection).toHaveClass('grid-rows-[1fr]')
    })
  })

  describe('generic type support', () => {
    it('works with different data types', () => {
      interface CustomData {
        name: string
        value: number
      }

      const customData: CustomData = { name: 'Custom', value: 42 }

      render(
        <ExpandableCard<CustomData>
          data={customData}
          renderCompact={(data) => (
            <span>
              {data.name}: {data.value}
            </span>
          )}
          renderDetails={(data) => <span>Value is {data.value}</span>}
        />
      )

      expect(screen.getByText('Custom: 42')).toBeInTheDocument()
    })
  })
})
