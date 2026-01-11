import { useState, useCallback, useId } from 'react'

interface UseExpandableOptions {
  /** When true, expansion is disabled */
  disabled?: boolean
  /** Optional callback instead of internal toggle */
  onClick?: () => void
}

interface UseExpandableResult {
  isExpanded: boolean
  detailsId: string
  handleToggle: () => void
}

/**
 * Hook for managing expandable/collapsible card state.
 * Handles expansion toggle with optional disabled state and custom click handler.
 */
export function useExpandable(options: UseExpandableOptions = {}): UseExpandableResult {
  const { disabled, onClick } = options
  const [isExpanded, setIsExpanded] = useState(false)
  const detailsId = useId()

  const handleToggle = useCallback(() => {
    if (disabled) return
    if (onClick) {
      onClick()
    } else {
      setIsExpanded((prev) => !prev)
    }
  }, [disabled, onClick])

  return { isExpanded, detailsId, handleToggle }
}
