import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { ExpandArrow } from './ExpandArrow'

describe('ExpandArrow', () => {
  describe('rendering', () => {
    it('renders an svg element', () => {
      const { container } = render(<ExpandArrow isExpanded={false} />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('is hidden from screen readers', () => {
      const { container } = render(<ExpandArrow isExpanded={false} />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('rotation', () => {
    it('does not rotate when collapsed', () => {
      const { container } = render(<ExpandArrow isExpanded={false} />)
      const svg = container.querySelector('svg')
      expect(svg).not.toHaveClass('rotate-180')
    })

    it('rotates 180 degrees when expanded', () => {
      const { container } = render(<ExpandArrow isExpanded={true} />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('rotate-180')
    })
  })

  describe('styling', () => {
    it('applies base classes', () => {
      const { container } = render(<ExpandArrow isExpanded={false} />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('w-4')
      expect(svg).toHaveClass('h-4')
      expect(svg).toHaveClass('text-text-subtle')
      expect(svg).toHaveClass('transition-transform')
      expect(svg).toHaveClass('duration-200')
    })

    it('applies custom className', () => {
      const { container } = render(<ExpandArrow isExpanded={false} className="custom-class" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('custom-class')
    })

    it('merges custom className with base classes', () => {
      const { container } = render(<ExpandArrow isExpanded={true} className="text-primary-500" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('w-4')
      expect(svg).toHaveClass('rotate-180')
      expect(svg).toHaveClass('text-primary-500')
    })
  })
})
