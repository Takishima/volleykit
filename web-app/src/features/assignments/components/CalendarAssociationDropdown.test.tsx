import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { CalendarAssociationDropdown } from './CalendarAssociationDropdown'
import { ALL_ASSOCIATIONS } from '../hooks/useCalendarAssociationFilter'

// Mock the useTranslation hook
vi.mock('@/shared/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'calendar.allAssociations': 'All associations',
        'calendar.filterByAssociation': 'Filter by association',
        'calendar.selectAssociation': 'Select association',
      }
      return translations[key] ?? key
    },
  }),
}))

describe('CalendarAssociationDropdown', () => {
  const defaultProps = {
    associations: ['SVRBA', 'SVRZ'],
    selected: ALL_ASSOCIATIONS,
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders nothing when associations array has less than 2 items', () => {
      const { container } = render(
        <CalendarAssociationDropdown
          associations={['SVRZ']}
          selected={ALL_ASSOCIATIONS}
          onChange={vi.fn()}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when associations array is empty', () => {
      const { container } = render(
        <CalendarAssociationDropdown
          associations={[]}
          selected={ALL_ASSOCIATIONS}
          onChange={vi.fn()}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders dropdown button when 2+ associations', () => {
      render(<CalendarAssociationDropdown {...defaultProps} />)

      expect(screen.getByRole('button', { name: /filter by association/i })).toBeInTheDocument()
    })

    it('displays "All associations" when ALL_ASSOCIATIONS is selected', () => {
      render(<CalendarAssociationDropdown {...defaultProps} />)

      expect(screen.getByText('All associations')).toBeInTheDocument()
    })

    it('displays association code when specific association is selected', () => {
      render(<CalendarAssociationDropdown {...defaultProps} selected="SVRZ" />)

      expect(screen.getByText('SVRZ')).toBeInTheDocument()
    })
  })

  describe('dropdown toggle', () => {
    it('opens dropdown when button is clicked', async () => {
      const user = userEvent.setup()
      render(<CalendarAssociationDropdown {...defaultProps} />)

      const button = screen.getByRole('button', {
        name: /filter by association/i,
      })
      await user.click(button)

      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('closes dropdown when button is clicked again', async () => {
      const user = userEvent.setup()
      render(<CalendarAssociationDropdown {...defaultProps} />)

      const button = screen.getByRole('button', {
        name: /filter by association/i,
      })

      // Open
      await user.click(button)
      expect(screen.getByRole('listbox')).toBeInTheDocument()

      // Close
      await user.click(button)
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('sets aria-expanded correctly', async () => {
      const user = userEvent.setup()
      render(<CalendarAssociationDropdown {...defaultProps} />)

      const button = screen.getByRole('button', {
        name: /filter by association/i,
      })

      expect(button).toHaveAttribute('aria-expanded', 'false')

      await user.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('option selection', () => {
    it('calls onChange with ALL_ASSOCIATIONS when "All associations" is clicked', async () => {
      const onChange = vi.fn()
      const user = userEvent.setup()

      render(<CalendarAssociationDropdown {...defaultProps} selected="SVRZ" onChange={onChange} />)

      // Open dropdown
      await user.click(screen.getByRole('button', { name: /filter by association/i }))

      // Click "All associations"
      await user.click(screen.getByRole('option', { name: 'All associations' }))

      expect(onChange).toHaveBeenCalledWith(ALL_ASSOCIATIONS)
    })

    it('calls onChange with association code when association is clicked', async () => {
      const onChange = vi.fn()
      const user = userEvent.setup()

      render(<CalendarAssociationDropdown {...defaultProps} onChange={onChange} />)

      // Open dropdown
      await user.click(screen.getByRole('button', { name: /filter by association/i }))

      // Click SVRZ option
      await user.click(screen.getByRole('option', { name: 'SVRZ' }))

      expect(onChange).toHaveBeenCalledWith('SVRZ')
    })

    it('closes dropdown after selection', async () => {
      const user = userEvent.setup()
      render(<CalendarAssociationDropdown {...defaultProps} />)

      // Open dropdown
      await user.click(screen.getByRole('button', { name: /filter by association/i }))

      // Click an option
      await user.click(screen.getByRole('option', { name: 'SVRBA' }))

      // Dropdown should be closed
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('displays all association options in the dropdown', async () => {
      const user = userEvent.setup()
      render(
        <CalendarAssociationDropdown
          associations={['SVRBA', 'SVRI', 'SVRZ']}
          selected={ALL_ASSOCIATIONS}
          onChange={vi.fn()}
        />
      )

      await user.click(screen.getByRole('button', { name: /filter by association/i }))

      expect(screen.getByRole('option', { name: 'All associations' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'SVRBA' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'SVRI' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'SVRZ' })).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has aria-haspopup attribute', () => {
      render(<CalendarAssociationDropdown {...defaultProps} />)

      expect(screen.getByRole('button', { name: /filter by association/i })).toHaveAttribute(
        'aria-haspopup',
        'listbox'
      )
    })

    it('has listbox role on dropdown menu', async () => {
      const user = userEvent.setup()
      render(<CalendarAssociationDropdown {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /filter by association/i }))

      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('has option role on each item', async () => {
      const user = userEvent.setup()
      render(<CalendarAssociationDropdown {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /filter by association/i }))

      const options = screen.getAllByRole('option')
      // "All associations" + 2 association codes
      expect(options).toHaveLength(3)
    })

    it('sets aria-selected correctly on options', async () => {
      const user = userEvent.setup()
      render(<CalendarAssociationDropdown {...defaultProps} selected="SVRZ" />)

      await user.click(screen.getByRole('button', { name: /filter by association/i }))

      expect(screen.getByRole('option', { name: 'All associations' })).toHaveAttribute(
        'aria-selected',
        'false'
      )
      expect(screen.getByRole('option', { name: 'SVRBA' })).toHaveAttribute(
        'aria-selected',
        'false'
      )
      expect(screen.getByRole('option', { name: 'SVRZ' })).toHaveAttribute('aria-selected', 'true')
    })

    it('has aria-label on listbox', async () => {
      const user = userEvent.setup()
      render(<CalendarAssociationDropdown {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /filter by association/i }))

      expect(screen.getByRole('listbox')).toHaveAttribute('aria-label', 'Select association')
    })
  })

  describe('click outside', () => {
    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <CalendarAssociationDropdown {...defaultProps} />
          <button data-testid="outside">Outside</button>
        </div>
      )

      // Open dropdown
      await user.click(screen.getByRole('button', { name: /filter by association/i }))
      expect(screen.getByRole('listbox')).toBeInTheDocument()

      // Click outside
      fireEvent.mouseDown(screen.getByTestId('outside'))

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })

    it('does not close dropdown when clicking inside', async () => {
      const user = userEvent.setup()
      render(<CalendarAssociationDropdown {...defaultProps} />)

      // Open dropdown
      await user.click(screen.getByRole('button', { name: /filter by association/i }))

      // Click inside the listbox (but not on an option)
      fireEvent.mouseDown(screen.getByRole('listbox'))

      // Dropdown should still be open
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
  })

  describe('visual states', () => {
    it('rotates chevron icon when dropdown is open', async () => {
      const user = userEvent.setup()
      render(<CalendarAssociationDropdown {...defaultProps} />)

      const button = screen.getByRole('button', {
        name: /filter by association/i,
      })

      // ChevronDown has aria-hidden, find by class
      const chevron = button.querySelector('svg')
      expect(chevron).not.toHaveClass('rotate-180')

      await user.click(button)

      expect(chevron).toHaveClass('rotate-180')
    })
  })
})
