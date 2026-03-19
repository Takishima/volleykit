import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { useTabNavigation } from './useTabNavigation'

describe('useTabNavigation', () => {
  const tabs = ['tab1', 'tab2', 'tab3'] as const

  describe('getTabProps', () => {
    it('returns correct props for active tab', () => {
      const onTabChange = vi.fn()
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: 'tab1',
          onTabChange,
        })
      )

      const props = result.current.getTabProps('tab1', 0)

      expect(props.role).toBe('tab')
      expect(props.id).toBe('tab-tab1')
      expect(props['aria-selected']).toBe(true)
      expect(props['aria-controls']).toBe('tabpanel-tab1')
      expect(props.tabIndex).toBe(0)
    })

    it('returns correct props for inactive tab', () => {
      const onTabChange = vi.fn()
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: 'tab1',
          onTabChange,
        })
      )

      const props = result.current.getTabProps('tab2', 1)

      expect(props['aria-selected']).toBe(false)
      expect(props.tabIndex).toBe(-1)
    })
  })

  describe('keyboard navigation', () => {
    it('handles ArrowRight to move to next tab', () => {
      const onTabChange = vi.fn()
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: 'tab1',
          onTabChange,
        })
      )

      const props = result.current.getTabProps('tab1', 0)
      const event = {
        key: 'ArrowRight',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>

      props.onKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(onTabChange).toHaveBeenCalledWith('tab2')
    })

    it('handles ArrowLeft to move to previous tab', () => {
      const onTabChange = vi.fn()
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: 'tab2',
          onTabChange,
        })
      )

      const props = result.current.getTabProps('tab2', 1)
      const event = {
        key: 'ArrowLeft',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>

      props.onKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(onTabChange).toHaveBeenCalledWith('tab1')
    })

    it('wraps around when pressing ArrowRight on last tab', () => {
      const onTabChange = vi.fn()
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: 'tab3',
          onTabChange,
        })
      )

      const props = result.current.getTabProps('tab3', 2)
      const event = {
        key: 'ArrowRight',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>

      props.onKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(onTabChange).toHaveBeenCalledWith('tab1')
    })

    it('wraps around when pressing ArrowLeft on first tab', () => {
      const onTabChange = vi.fn()
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: 'tab1',
          onTabChange,
        })
      )

      const props = result.current.getTabProps('tab1', 0)
      const event = {
        key: 'ArrowLeft',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>

      props.onKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(onTabChange).toHaveBeenCalledWith('tab3')
    })

    it('handles Home key to jump to first tab', () => {
      const onTabChange = vi.fn()
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: 'tab3',
          onTabChange,
        })
      )

      const props = result.current.getTabProps('tab3', 2)
      const event = {
        key: 'Home',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>

      props.onKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(onTabChange).toHaveBeenCalledWith('tab1')
    })

    it('handles End key to jump to last tab', () => {
      const onTabChange = vi.fn()
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: 'tab1',
          onTabChange,
        })
      )

      const props = result.current.getTabProps('tab1', 0)
      const event = {
        key: 'End',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>

      props.onKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(onTabChange).toHaveBeenCalledWith('tab3')
    })

    it('does nothing when Home is pressed on first tab', () => {
      const onTabChange = vi.fn()
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: 'tab1',
          onTabChange,
        })
      )

      const props = result.current.getTabProps('tab1', 0)
      const event = {
        key: 'Home',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>

      props.onKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(onTabChange).toHaveBeenCalledWith('tab1')
    })

    it('does nothing when End is pressed on last tab', () => {
      const onTabChange = vi.fn()
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: 'tab3',
          onTabChange,
        })
      )

      const props = result.current.getTabProps('tab3', 2)
      const event = {
        key: 'End',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>

      props.onKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(onTabChange).toHaveBeenCalledWith('tab3')
    })

    it('ignores other keys', () => {
      const onTabChange = vi.fn()
      const { result } = renderHook(() =>
        useTabNavigation({
          tabs,
          activeTab: 'tab1',
          onTabChange,
        })
      )

      const props = result.current.getTabProps('tab1', 0)
      const event = {
        key: 'Enter',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLButtonElement>

      props.onKeyDown(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(onTabChange).not.toHaveBeenCalled()
    })
  })
})
