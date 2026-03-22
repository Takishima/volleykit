import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'

import { useModalDismissal } from './useModalDismissal'

describe('useModalDismissal', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('escape key handling', () => {
    it('should call onClose when Escape is pressed and modal is open', () => {
      const onClose = vi.fn()
      renderHook(() =>
        useModalDismissal({
          isOpen: true,
          onClose,
        })
      )

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should not call onClose when Escape is pressed and modal is closed', () => {
      const onClose = vi.fn()
      renderHook(() =>
        useModalDismissal({
          isOpen: false,
          onClose,
        })
      )

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })

      expect(onClose).not.toHaveBeenCalled()
    })

    it('should not call onClose when Escape is pressed and isLoading is true', () => {
      const onClose = vi.fn()
      renderHook(() =>
        useModalDismissal({
          isOpen: true,
          onClose,
          isLoading: true,
        })
      )

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })

      expect(onClose).not.toHaveBeenCalled()
    })

    it('should not call onClose when other keys are pressed', () => {
      const onClose = vi.fn()
      renderHook(() =>
        useModalDismissal({
          isOpen: true,
          onClose,
        })
      )

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
      })

      expect(onClose).not.toHaveBeenCalled()
    })

    it('should not add event listener when closeOnEscape is false', () => {
      const onClose = vi.fn()
      renderHook(() =>
        useModalDismissal({
          isOpen: true,
          onClose,
          closeOnEscape: false,
        })
      )

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })

      expect(onClose).not.toHaveBeenCalled()
    })

    it('should cleanup event listener when modal closes', () => {
      const onClose = vi.fn()
      const { rerender } = renderHook(
        ({ isOpen }) =>
          useModalDismissal({
            isOpen,
            onClose,
          }),
        { initialProps: { isOpen: true } }
      )

      // Verify listener is active
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })
      expect(onClose).toHaveBeenCalledTimes(1)

      // Close modal
      rerender({ isOpen: false })

      // Verify listener is removed
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should respond to Escape after isLoading changes from true to false', () => {
      const onClose = vi.fn()
      const { rerender } = renderHook(
        ({ isLoading }) =>
          useModalDismissal({
            isOpen: true,
            onClose,
            isLoading,
          }),
        { initialProps: { isLoading: true } }
      )

      // Should not close while loading
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })
      expect(onClose).not.toHaveBeenCalled()

      // Loading finished
      rerender({ isLoading: false })

      // Should now close
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('backdrop click handling', () => {
    function createMockClickEvent(targetIsSelf: boolean): React.MouseEvent<HTMLDivElement> {
      const target = document.createElement('div')
      const currentTarget = targetIsSelf ? target : document.createElement('div')
      return {
        target,
        currentTarget,
      } as unknown as React.MouseEvent<HTMLDivElement>
    }

    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn()
      const { result } = renderHook(() =>
        useModalDismissal({
          isOpen: true,
          onClose,
        })
      )

      act(() => {
        result.current.handleBackdropClick(createMockClickEvent(true))
      })

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should not call onClose when clicking inside the modal', () => {
      const onClose = vi.fn()
      const { result } = renderHook(() =>
        useModalDismissal({
          isOpen: true,
          onClose,
        })
      )

      act(() => {
        result.current.handleBackdropClick(createMockClickEvent(false))
      })

      expect(onClose).not.toHaveBeenCalled()
    })

    it('should not call onClose when isLoading is true', () => {
      const onClose = vi.fn()
      const { result } = renderHook(() =>
        useModalDismissal({
          isOpen: true,
          onClose,
          isLoading: true,
        })
      )

      act(() => {
        result.current.handleBackdropClick(createMockClickEvent(true))
      })

      expect(onClose).not.toHaveBeenCalled()
    })

    it('should not call onClose when closeOnBackdropClick is false', () => {
      const onClose = vi.fn()
      const { result } = renderHook(() =>
        useModalDismissal({
          isOpen: true,
          onClose,
          closeOnBackdropClick: false,
        })
      )

      act(() => {
        result.current.handleBackdropClick(createMockClickEvent(true))
      })

      expect(onClose).not.toHaveBeenCalled()
    })

    it("should maintain stable handleBackdropClick reference when options don't change", () => {
      const onClose = vi.fn()
      const { result, rerender } = renderHook(() =>
        useModalDismissal({
          isOpen: true,
          onClose,
        })
      )

      const firstReference = result.current.handleBackdropClick
      rerender()

      expect(result.current.handleBackdropClick).toBe(firstReference)
    })

    it('should update handleBackdropClick when onClose changes', () => {
      const onClose1 = vi.fn()
      const onClose2 = vi.fn()
      const { result, rerender } = renderHook(
        ({ closeFn }) =>
          useModalDismissal({
            isOpen: true,
            onClose: closeFn,
          }),
        { initialProps: { closeFn: onClose1 } }
      )

      act(() => {
        result.current.handleBackdropClick(createMockClickEvent(true))
      })
      expect(onClose1).toHaveBeenCalledTimes(1)
      expect(onClose2).not.toHaveBeenCalled()

      rerender({ closeFn: onClose2 })

      act(() => {
        result.current.handleBackdropClick(createMockClickEvent(true))
      })
      expect(onClose1).toHaveBeenCalledTimes(1)
      expect(onClose2).toHaveBeenCalledTimes(1)
    })
  })

  describe('combined options', () => {
    it('should disable both dismissal methods when isLoading is true', () => {
      const onClose = vi.fn()
      const { result } = renderHook(() =>
        useModalDismissal({
          isOpen: true,
          onClose,
          isLoading: true,
        })
      )

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })
      expect(onClose).not.toHaveBeenCalled()

      const target = document.createElement('div')
      act(() => {
        result.current.handleBackdropClick({
          target,
          currentTarget: target,
        } as unknown as React.MouseEvent<HTMLDivElement>)
      })
      expect(onClose).not.toHaveBeenCalled()
    })

    it('should allow disabling escape while keeping backdrop click enabled', () => {
      const onClose = vi.fn()
      const { result } = renderHook(() =>
        useModalDismissal({
          isOpen: true,
          onClose,
          closeOnEscape: false,
          closeOnBackdropClick: true,
        })
      )

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })
      expect(onClose).not.toHaveBeenCalled()

      const target = document.createElement('div')
      act(() => {
        result.current.handleBackdropClick({
          target,
          currentTarget: target,
        } as unknown as React.MouseEvent<HTMLDivElement>)
      })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should allow disabling backdrop click while keeping escape enabled', () => {
      const onClose = vi.fn()
      const { result } = renderHook(() =>
        useModalDismissal({
          isOpen: true,
          onClose,
          closeOnEscape: true,
          closeOnBackdropClick: false,
        })
      )

      const target = document.createElement('div')
      act(() => {
        result.current.handleBackdropClick({
          target,
          currentTarget: target,
        } as unknown as React.MouseEvent<HTMLDivElement>)
      })
      expect(onClose).not.toHaveBeenCalled()

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('default options', () => {
    it('should use sensible defaults', () => {
      const onClose = vi.fn()
      const { result } = renderHook(() =>
        useModalDismissal({
          isOpen: true,
          onClose,
        })
      )

      // Default: closeOnEscape = true
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })
      expect(onClose).toHaveBeenCalledTimes(1)

      // Default: closeOnBackdropClick = true
      const target = document.createElement('div')
      act(() => {
        result.current.handleBackdropClick({
          target,
          currentTarget: target,
        } as unknown as React.MouseEvent<HTMLDivElement>)
      })
      expect(onClose).toHaveBeenCalledTimes(2)
    })
  })
})
