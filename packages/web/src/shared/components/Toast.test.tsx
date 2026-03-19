import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useToastStore, DEFAULT_DURATION_MS } from '@/shared/stores/toast'

import { ToastContainer } from './Toast'

// Mock crypto.randomUUID for consistent test IDs
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => `toast-${Math.random().toString(36).slice(2)}`),
})

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useToastStore.setState({ toasts: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('renders nothing when there are no toasts', () => {
      const { container } = render(<ToastContainer />)
      expect(container.firstChild).toBeNull()
    })

    it('renders toast container when toasts exist', () => {
      useToastStore.getState().addToast({
        message: 'Test toast',
        type: 'info',
      })

      render(<ToastContainer />)

      expect(screen.getByText('Test toast')).toBeInTheDocument()
    })

    it('renders multiple toasts', () => {
      const { addToast } = useToastStore.getState()
      addToast({ message: 'First toast', type: 'success' })
      addToast({ message: 'Second toast', type: 'error' })
      addToast({ message: 'Third toast', type: 'warning' })

      render(<ToastContainer />)

      expect(screen.getByText('First toast')).toBeInTheDocument()
      expect(screen.getByText('Second toast')).toBeInTheDocument()
      expect(screen.getByText('Third toast')).toBeInTheDocument()
    })

    it('has correct aria-label on container', () => {
      useToastStore.getState().addToast({
        message: 'Test toast',
        type: 'info',
      })

      render(<ToastContainer />)

      expect(screen.getByLabelText('Notifications')).toBeInTheDocument()
    })
  })

  describe('toast types', () => {
    it('renders success toast with correct styling', () => {
      useToastStore.getState().addToast({
        message: 'Success message',
        type: 'success',
      })

      render(<ToastContainer />)

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-green-50')
      expect(alert).toHaveClass('border-green-200')
    })

    it('renders error toast with correct styling', () => {
      useToastStore.getState().addToast({
        message: 'Error message',
        type: 'error',
      })

      render(<ToastContainer />)

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-red-50')
      expect(alert).toHaveClass('border-red-200')
    })

    it('renders warning toast with correct styling', () => {
      useToastStore.getState().addToast({
        message: 'Warning message',
        type: 'warning',
      })

      render(<ToastContainer />)

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-amber-50')
      expect(alert).toHaveClass('border-amber-200')
    })

    it('renders info toast with correct styling', () => {
      useToastStore.getState().addToast({
        message: 'Info message',
        type: 'info',
      })

      render(<ToastContainer />)

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-blue-50')
      expect(alert).toHaveClass('border-blue-200')
    })
  })

  describe('auto-dismiss', () => {
    it('removes toast after default duration', () => {
      useToastStore.getState().addToast({
        message: 'Auto-dismiss toast',
        type: 'info',
      })

      render(<ToastContainer />)

      expect(screen.getByText('Auto-dismiss toast')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(DEFAULT_DURATION_MS)
      })

      expect(screen.queryByText('Auto-dismiss toast')).not.toBeInTheDocument()
    })

    it('removes toast after custom duration', () => {
      useToastStore.getState().addToast({
        message: 'Custom duration toast',
        type: 'success',
        duration: 2000,
      })

      render(<ToastContainer />)

      expect(screen.getByText('Custom duration toast')).toBeInTheDocument()

      // Should still be there before duration
      act(() => {
        vi.advanceTimersByTime(1500)
      })
      expect(screen.getByText('Custom duration toast')).toBeInTheDocument()

      // Should be gone after duration
      act(() => {
        vi.advanceTimersByTime(600)
      })
      expect(screen.queryByText('Custom duration toast')).not.toBeInTheDocument()
    })

    it('clears timeout on unmount', () => {
      useToastStore.getState().addToast({
        message: 'Will unmount',
        type: 'info',
      })

      const { unmount } = render(<ToastContainer />)

      unmount()

      // Advance timers - should not throw
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DURATION_MS + 1000)
      })

      // Toast should still be in store (not removed by timer since component unmounted)
      expect(useToastStore.getState().toasts).toHaveLength(1)
    })
  })

  describe('manual dismiss', () => {
    it('removes toast when dismiss button is clicked', () => {
      useToastStore.getState().addToast({
        message: 'Dismissible toast',
        type: 'warning',
      })

      render(<ToastContainer />)

      expect(screen.getByText('Dismissible toast')).toBeInTheDocument()

      const dismissButton = screen.getByRole('button', {
        name: /dismiss notification/i,
      })
      fireEvent.click(dismissButton)

      expect(screen.queryByText('Dismissible toast')).not.toBeInTheDocument()
    })

    it('only removes clicked toast, not others', () => {
      const { addToast } = useToastStore.getState()
      addToast({ message: 'First toast', type: 'info' })
      addToast({ message: 'Second toast', type: 'success' })

      render(<ToastContainer />)

      const dismissButtons = screen.getAllByRole('button', {
        name: /dismiss notification/i,
      })

      // Dismiss the first toast
      fireEvent.click(dismissButtons[0]!)

      expect(screen.queryByText('First toast')).not.toBeInTheDocument()
      expect(screen.getByText('Second toast')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has role=alert on each toast', () => {
      useToastStore.getState().addToast({
        message: 'Alert toast',
        type: 'error',
      })

      render(<ToastContainer />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('has aria-live=polite for non-intrusive announcements', () => {
      useToastStore.getState().addToast({
        message: 'Polite toast',
        type: 'info',
      })

      render(<ToastContainer />)

      const alert = screen.getByRole('alert')
      expect(alert).toHaveAttribute('aria-live', 'polite')
    })

    it('dismiss button has accessible label', () => {
      useToastStore.getState().addToast({
        message: 'Accessible toast',
        type: 'success',
      })

      render(<ToastContainer />)

      expect(screen.getByRole('button', { name: /dismiss notification/i })).toBeInTheDocument()
    })

    it('icons have aria-hidden=true', () => {
      useToastStore.getState().addToast({
        message: 'Toast with icon',
        type: 'success',
      })

      render(<ToastContainer />)

      const svgs = document.querySelectorAll('svg')
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('aria-hidden', 'true')
      })
    })
  })

  describe('animation classes', () => {
    it('has animation classes for entry', () => {
      useToastStore.getState().addToast({
        message: 'Animated toast',
        type: 'info',
      })

      render(<ToastContainer />)

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('animate-in')
      expect(alert).toHaveClass('slide-in-from-top-2')
      expect(alert).toHaveClass('fade-in')
    })
  })

  describe('z-index stacking', () => {
    it('container has high z-index for proper stacking', () => {
      useToastStore.getState().addToast({
        message: 'Stacked toast',
        type: 'info',
      })

      render(<ToastContainer />)

      const container = screen.getByLabelText('Notifications')
      expect(container).toHaveClass('z-[100]')
    })
  })

  describe('integration with store', () => {
    it('reflects store updates in real-time', () => {
      render(<ToastContainer />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()

      // Add toast after initial render
      act(() => {
        useToastStore.getState().addToast({
          message: 'Dynamic toast',
          type: 'info',
        })
      })

      expect(screen.getByText('Dynamic toast')).toBeInTheDocument()

      // Clear all toasts
      act(() => {
        useToastStore.getState().clearToasts()
      })

      expect(screen.queryByText('Dynamic toast')).not.toBeInTheDocument()
    })
  })
})
