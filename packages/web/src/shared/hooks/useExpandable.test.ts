import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { useExpandable } from './useExpandable'

describe('useExpandable', () => {
  describe('initial state', () => {
    it('should start collapsed by default', () => {
      const { result } = renderHook(() => useExpandable())

      expect(result.current.isExpanded).toBe(false)
    })

    it('should return a unique detailsId for accessibility', () => {
      const { result: result1 } = renderHook(() => useExpandable())
      const { result: result2 } = renderHook(() => useExpandable())

      expect(result1.current.detailsId).toBeTruthy()
      expect(result2.current.detailsId).toBeTruthy()
      expect(result1.current.detailsId).not.toBe(result2.current.detailsId)
    })
  })

  describe('toggle behavior', () => {
    it('should toggle isExpanded when handleToggle is called', () => {
      const { result } = renderHook(() => useExpandable())

      expect(result.current.isExpanded).toBe(false)

      act(() => {
        result.current.handleToggle()
      })

      expect(result.current.isExpanded).toBe(true)

      act(() => {
        result.current.handleToggle()
      })

      expect(result.current.isExpanded).toBe(false)
    })

    it('should maintain stable handleToggle reference', () => {
      const { result, rerender } = renderHook(() => useExpandable())
      const firstReference = result.current.handleToggle

      rerender()

      expect(result.current.handleToggle).toBe(firstReference)
    })
  })

  describe('disabled option', () => {
    it('should not toggle when disabled is true', () => {
      const { result } = renderHook(() => useExpandable({ disabled: true }))

      expect(result.current.isExpanded).toBe(false)

      act(() => {
        result.current.handleToggle()
      })

      expect(result.current.isExpanded).toBe(false)
    })

    it('should toggle when disabled changes from true to false', () => {
      const { result, rerender } = renderHook(({ disabled }) => useExpandable({ disabled }), {
        initialProps: { disabled: true },
      })

      act(() => {
        result.current.handleToggle()
      })
      expect(result.current.isExpanded).toBe(false)

      rerender({ disabled: false })

      act(() => {
        result.current.handleToggle()
      })
      expect(result.current.isExpanded).toBe(true)
    })
  })

  describe('onClick option', () => {
    it('should call onClick instead of toggling when provided', () => {
      const onClick = vi.fn()
      const { result } = renderHook(() => useExpandable({ onClick }))

      expect(result.current.isExpanded).toBe(false)

      act(() => {
        result.current.handleToggle()
      })

      expect(onClick).toHaveBeenCalledTimes(1)
      // isExpanded should not change when onClick is provided
      expect(result.current.isExpanded).toBe(false)
    })

    it('should not call onClick when disabled', () => {
      const onClick = vi.fn()
      const { result } = renderHook(() => useExpandable({ disabled: true, onClick }))

      act(() => {
        result.current.handleToggle()
      })

      expect(onClick).not.toHaveBeenCalled()
    })

    it('should update handleToggle when onClick changes', () => {
      const onClick1 = vi.fn()
      const onClick2 = vi.fn()

      const { result, rerender } = renderHook(({ onClick }) => useExpandable({ onClick }), {
        initialProps: { onClick: onClick1 },
      })

      act(() => {
        result.current.handleToggle()
      })
      expect(onClick1).toHaveBeenCalledTimes(1)
      expect(onClick2).not.toHaveBeenCalled()

      rerender({ onClick: onClick2 })

      act(() => {
        result.current.handleToggle()
      })
      expect(onClick1).toHaveBeenCalledTimes(1)
      expect(onClick2).toHaveBeenCalledTimes(1)
    })
  })

  describe('combined options', () => {
    it('should handle transitioning from onClick to internal toggle', () => {
      const onClick = vi.fn()
      const { result, rerender } = renderHook(
        ({ onClick }: { onClick?: () => void }) => useExpandable({ onClick }),
        { initialProps: { onClick } as { onClick?: () => void } }
      )

      act(() => {
        result.current.handleToggle()
      })
      expect(onClick).toHaveBeenCalled()
      expect(result.current.isExpanded).toBe(false)

      // Remove onClick, should now use internal toggle
      rerender({ onClick: undefined })

      act(() => {
        result.current.handleToggle()
      })
      expect(result.current.isExpanded).toBe(true)
    })
  })
})
