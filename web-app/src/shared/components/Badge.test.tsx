import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { Badge } from './Badge'

describe('Badge', () => {
  describe('rendering', () => {
    it('renders children correctly', () => {
      render(<Badge>Test Badge</Badge>)
      expect(screen.getByText('Test Badge')).toBeInTheDocument()
    })

    it('renders as a span element', () => {
      render(<Badge>Test</Badge>)
      expect(screen.getByText('Test').tagName).toBe('SPAN')
    })

    it('applies title attribute when provided', () => {
      render(<Badge title="Badge tooltip">Test</Badge>)
      expect(screen.getByText('Test')).toHaveAttribute('title', 'Badge tooltip')
    })

    it('applies custom className', () => {
      render(<Badge className="custom-class">Test</Badge>)
      expect(screen.getByText('Test')).toHaveClass('custom-class')
    })
  })

  describe('variants', () => {
    it('applies neutral variant styles by default', () => {
      render(<Badge>Neutral</Badge>)
      const badge = screen.getByText('Neutral')
      expect(badge).toHaveClass('bg-surface-subtle')
      expect(badge).toHaveClass('text-text-secondary')
    })

    it('applies neutral variant styles explicitly', () => {
      render(<Badge variant="neutral">Neutral</Badge>)
      const badge = screen.getByText('Neutral')
      expect(badge).toHaveClass('bg-surface-subtle')
      expect(badge).toHaveClass('text-text-secondary')
    })

    it('applies success variant styles', () => {
      render(<Badge variant="success">Success</Badge>)
      const badge = screen.getByText('Success')
      expect(badge).toHaveClass('bg-success-100')
      expect(badge).toHaveClass('text-success-800')
    })

    it('applies warning variant styles', () => {
      render(<Badge variant="warning">Warning</Badge>)
      const badge = screen.getByText('Warning')
      expect(badge).toHaveClass('bg-warning-100')
      expect(badge).toHaveClass('text-warning-800')
    })

    it('applies danger variant styles', () => {
      render(<Badge variant="danger">Danger</Badge>)
      const badge = screen.getByText('Danger')
      expect(badge).toHaveClass('bg-danger-100')
      expect(badge).toHaveClass('text-danger-800')
    })
  })

  describe('base styles', () => {
    it('applies base padding and text styles', () => {
      render(<Badge>Test</Badge>)
      const badge = screen.getByText('Test')
      expect(badge).toHaveClass('px-1.5')
      expect(badge).toHaveClass('py-0.5')
      expect(badge).toHaveClass('rounded')
      expect(badge).toHaveClass('text-xs')
      expect(badge).toHaveClass('font-medium')
    })
  })
})
