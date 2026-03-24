import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import type { ChecklistSection } from '@/common/utils/pdf-field-mappings'

import { SectionSelector } from './SectionSelector'

vi.mock('@/common/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'pdf.wizard.nonConformant.selectSections': 'Select non-conformant sections',
      }
      return map[key] ?? key
    },
    tInterpolate: (key: string, values: Record<string, string | number>) => {
      if (key === 'pdf.wizard.nonConformant.flaggedCount') {
        return `${values.count} of ${values.total} flagged`
      }
      return key
    },
  }),
}))

const mockSections: ChecklistSection[] = [
  {
    id: '1',
    labelKey: 'pdf.checklist.section1' as never,
    subItems: [{ id: 'sub-1', labelKey: 'pdf.checklist.sub1' as never }],
  },
  {
    id: '2',
    labelKey: 'pdf.checklist.section2' as never,
    subItems: [{ id: 'sub-2', labelKey: 'pdf.checklist.sub2' as never }],
  },
  {
    id: '3',
    labelKey: 'pdf.checklist.section3' as never,
    subItems: [{ id: 'sub-3', labelKey: 'pdf.checklist.sub3' as never }],
  },
]

describe('SectionSelector', () => {
  it('renders a button for each section', () => {
    render(
      <SectionSelector
        sections={mockSections}
        flaggedSections={new Set()}
        onToggleSection={vi.fn()}
      />
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
  })

  it('renders the instruction text', () => {
    render(
      <SectionSelector
        sections={mockSections}
        flaggedSections={new Set()}
        onToggleSection={vi.fn()}
      />
    )
    expect(screen.getByText('Select non-conformant sections')).toBeInTheDocument()
  })

  it('does not show flagged count badge when no sections are flagged', () => {
    render(
      <SectionSelector
        sections={mockSections}
        flaggedSections={new Set()}
        onToggleSection={vi.fn()}
      />
    )
    expect(screen.queryByText(/flagged/i)).not.toBeInTheDocument()
  })

  it('shows flagged count badge when sections are flagged', () => {
    render(
      <SectionSelector
        sections={mockSections}
        flaggedSections={new Set(['1', '2'])}
        onToggleSection={vi.fn()}
      />
    )
    expect(screen.getByText('2 of 3 flagged')).toBeInTheDocument()
  })

  it('calls onToggleSection with the section id when a button is clicked', () => {
    const onToggle = vi.fn()
    render(
      <SectionSelector
        sections={mockSections}
        flaggedSections={new Set()}
        onToggleSection={onToggle}
      />
    )
    fireEvent.click(screen.getAllByRole('button')[0]!)
    expect(onToggle).toHaveBeenCalledWith('1')
  })

  it('calls onToggleSection again to un-flag a section', () => {
    const onToggle = vi.fn()
    render(
      <SectionSelector
        sections={mockSections}
        flaggedSections={new Set(['1'])}
        onToggleSection={onToggle}
      />
    )
    fireEvent.click(screen.getAllByRole('button')[0]!)
    expect(onToggle).toHaveBeenCalledWith('1')
  })

  it('renders section ids as visible text', () => {
    render(
      <SectionSelector
        sections={mockSections}
        flaggedSections={new Set()}
        onToggleSection={vi.fn()}
      />
    )
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
