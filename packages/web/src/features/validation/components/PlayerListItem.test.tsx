import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import type { RosterPlayer } from '@/features/validation/hooks/useNominationList'

import { PlayerListItem, type PlayerDisplayData } from './PlayerListItem'

function createMockPlayer(overrides: Partial<RosterPlayer> = {}): RosterPlayer {
  return {
    id: 'player-1',
    displayName: 'John Doe',
    isNewlyAdded: false,
    ...overrides,
  }
}

function createDisplayData(overrides: Partial<PlayerDisplayData> = {}): PlayerDisplayData {
  return {
    lastName: 'Doe',
    firstInitial: 'J.',
    dob: '01.01.90',
    ...overrides,
  }
}

describe('PlayerListItem', () => {
  it('renders player name in aligned columns', () => {
    const player = createMockPlayer({ displayName: 'Max' })
    const displayData = createDisplayData({ lastName: 'Max', firstInitial: 'M.', dob: '01.01.90' })

    render(
      <PlayerListItem
        player={player}
        displayData={displayData}
        maxLastNameWidth={10}
        isMarkedForRemoval={false}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />
    )

    expect(screen.getByText('Max')).toBeInTheDocument()
    expect(screen.getByText('M.')).toBeInTheDocument()
    expect(screen.getByText('01.01.90')).toBeInTheDocument()
  })

  it('shows newly added badge when isNewlyAdded is true', () => {
    const player = createMockPlayer({ isNewlyAdded: true })

    render(
      <PlayerListItem
        player={player}
        displayData={createDisplayData()}
        maxLastNameWidth={10}
        isMarkedForRemoval={false}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />
    )

    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = vi.fn()
    const player = createMockPlayer()

    render(
      <PlayerListItem
        player={player}
        displayData={createDisplayData()}
        maxLastNameWidth={10}
        isMarkedForRemoval={false}
        onRemove={onRemove}
        onUndoRemoval={vi.fn()}
      />
    )

    const removeButton = screen.getByRole('button', { name: /remove/i })
    fireEvent.click(removeButton)

    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('shows undo button when marked for removal', () => {
    const player = createMockPlayer()

    render(
      <PlayerListItem
        player={player}
        displayData={createDisplayData()}
        maxLastNameWidth={10}
        isMarkedForRemoval={true}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
  })

  it('calls onUndoRemoval when undo button is clicked', () => {
    const onUndoRemoval = vi.fn()
    const player = createMockPlayer()

    render(
      <PlayerListItem
        player={player}
        displayData={createDisplayData()}
        maxLastNameWidth={10}
        isMarkedForRemoval={true}
        onRemove={vi.fn()}
        onUndoRemoval={onUndoRemoval}
      />
    )

    const undoButton = screen.getByRole('button', { name: /undo/i })
    fireEvent.click(undoButton)

    expect(onUndoRemoval).toHaveBeenCalledTimes(1)
  })

  it('applies strikethrough styling when marked for removal', () => {
    const player = createMockPlayer()
    const displayData = createDisplayData({ lastName: 'Doe' })

    render(
      <PlayerListItem
        player={player}
        displayData={displayData}
        maxLastNameWidth={10}
        isMarkedForRemoval={true}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />
    )

    const lastNameElement = screen.getByText('Doe')
    expect(lastNameElement).toHaveClass('line-through')
  })

  it('hides newly added badge when marked for removal', () => {
    const player = createMockPlayer({
      isNewlyAdded: true,
    })

    render(
      <PlayerListItem
        player={player}
        displayData={createDisplayData()}
        maxLastNameWidth={10}
        isMarkedForRemoval={true}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />
    )

    expect(screen.queryByText('New')).not.toBeInTheDocument()
  })

  it('aligns last names based on maxLastNameWidth', () => {
    const player = createMockPlayer()
    const displayData = createDisplayData({ lastName: 'Doe' })

    render(
      <PlayerListItem
        player={player}
        displayData={displayData}
        maxLastNameWidth={12}
        isMarkedForRemoval={false}
        onRemove={vi.fn()}
        onUndoRemoval={vi.fn()}
      />
    )

    const lastNameElement = screen.getByText('Doe')
    expect(lastNameElement).toHaveStyle({ minWidth: '12ch' })
  })
})
