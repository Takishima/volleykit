import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { Tabs, TabPanel } from './Tabs'

const mockTabs = [
  { id: 'tab1', label: 'Tab 1' },
  { id: 'tab2', label: 'Tab 2' },
  { id: 'tab3', label: 'Tab 3', badge: 'Optional' },
]

describe('Tabs', () => {
  it('renders all tabs with correct labels', () => {
    render(<Tabs tabs={mockTabs} activeTab="tab1" onTabChange={vi.fn()} ariaLabel="Test tabs" />)

    expect(screen.getByText('Tab 1')).toBeInTheDocument()
    expect(screen.getByText('Tab 2')).toBeInTheDocument()
    expect(screen.getByText('Tab 3')).toBeInTheDocument()
  })

  it('shows active tab with aria-selected true', () => {
    render(<Tabs tabs={mockTabs} activeTab="tab2" onTabChange={vi.fn()} ariaLabel="Test tabs" />)

    const activeTab = screen.getByRole('tab', { name: /Tab 2/i })
    expect(activeTab).toHaveAttribute('aria-selected', 'true')

    const inactiveTab = screen.getByRole('tab', { name: /Tab 1/i })
    expect(inactiveTab).toHaveAttribute('aria-selected', 'false')
  })

  it('renders badge when provided', () => {
    render(<Tabs tabs={mockTabs} activeTab="tab1" onTabChange={vi.fn()} ariaLabel="Test tabs" />)

    expect(screen.getByText('Optional')).toBeInTheDocument()
  })

  it('calls onTabChange when tab is clicked', () => {
    const handleTabChange = vi.fn()
    render(
      <Tabs tabs={mockTabs} activeTab="tab1" onTabChange={handleTabChange} ariaLabel="Test tabs" />
    )

    fireEvent.click(screen.getByRole('tab', { name: /Tab 2/i }))
    expect(handleTabChange).toHaveBeenCalledWith('tab2')
  })

  it('navigates to next tab with ArrowRight key', () => {
    const handleTabChange = vi.fn()
    render(
      <Tabs tabs={mockTabs} activeTab="tab1" onTabChange={handleTabChange} ariaLabel="Test tabs" />
    )

    const firstTab = screen.getByRole('tab', { name: /Tab 1/i })
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' })

    expect(handleTabChange).toHaveBeenCalledWith('tab2')
  })

  it('navigates to previous tab with ArrowLeft key', () => {
    const handleTabChange = vi.fn()
    render(
      <Tabs tabs={mockTabs} activeTab="tab2" onTabChange={handleTabChange} ariaLabel="Test tabs" />
    )

    const secondTab = screen.getByRole('tab', { name: /Tab 2/i })
    fireEvent.keyDown(secondTab, { key: 'ArrowLeft' })

    expect(handleTabChange).toHaveBeenCalledWith('tab1')
  })

  it('wraps around when navigating past last tab', () => {
    const handleTabChange = vi.fn()
    render(
      <Tabs tabs={mockTabs} activeTab="tab3" onTabChange={handleTabChange} ariaLabel="Test tabs" />
    )

    const lastTab = screen.getByRole('tab', { name: /Tab 3/i })
    fireEvent.keyDown(lastTab, { key: 'ArrowRight' })

    expect(handleTabChange).toHaveBeenCalledWith('tab1')
  })

  it('wraps around when navigating before first tab', () => {
    const handleTabChange = vi.fn()
    render(
      <Tabs tabs={mockTabs} activeTab="tab1" onTabChange={handleTabChange} ariaLabel="Test tabs" />
    )

    const firstTab = screen.getByRole('tab', { name: /Tab 1/i })
    fireEvent.keyDown(firstTab, { key: 'ArrowLeft' })

    expect(handleTabChange).toHaveBeenCalledWith('tab3')
  })

  it('has correct ARIA attributes on tablist', () => {
    render(<Tabs tabs={mockTabs} activeTab="tab1" onTabChange={vi.fn()} ariaLabel="Test tabs" />)

    const tablist = screen.getByRole('tablist')
    expect(tablist).toHaveAttribute('aria-label', 'Test tabs')
  })

  it('has correct tabIndex on tabs (0 for active, -1 for inactive)', () => {
    render(<Tabs tabs={mockTabs} activeTab="tab2" onTabChange={vi.fn()} ariaLabel="Test tabs" />)

    const activeTab = screen.getByRole('tab', { name: /Tab 2/i })
    expect(activeTab).toHaveAttribute('tabIndex', '0')

    const inactiveTab = screen.getByRole('tab', { name: /Tab 1/i })
    expect(inactiveTab).toHaveAttribute('tabIndex', '-1')
  })

  it('has overflow-x-auto class for horizontal scrolling', () => {
    render(<Tabs tabs={mockTabs} activeTab="tab1" onTabChange={vi.fn()} ariaLabel="Test tabs" />)

    const tablist = screen.getByRole('tablist')
    expect(tablist).toHaveClass('overflow-x-auto')
  })
})

describe('TabPanel', () => {
  it('renders content when active', () => {
    render(
      <TabPanel tabId="tab1" activeTab="tab1">
        Panel content
      </TabPanel>
    )

    expect(screen.getByText('Panel content')).toBeInTheDocument()
  })

  it('hides content when not active', () => {
    render(
      <TabPanel tabId="tab1" activeTab="tab2">
        Panel content
      </TabPanel>
    )

    const panel = screen.getByRole('tabpanel', { hidden: true })
    expect(panel).toHaveAttribute('hidden')
  })

  it('has correct ARIA attributes', () => {
    render(
      <TabPanel tabId="test-tab" activeTab="test-tab">
        Panel content
      </TabPanel>
    )

    const panel = screen.getByRole('tabpanel')
    expect(panel).toHaveAttribute('id', 'tabpanel-test-tab')
    expect(panel).toHaveAttribute('aria-labelledby', 'tab-test-tab')
  })
})
