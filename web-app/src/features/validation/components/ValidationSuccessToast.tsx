/** Z-index for toast notification (above all dialogs) */
const Z_INDEX_TOAST = 70

interface ValidationSuccessToastProps {
  message: string
}

/**
 * Success toast notification displayed after validation is complete.
 */
export function ValidationSuccessToast({ message }: ValidationSuccessToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"
      style={{ zIndex: Z_INDEX_TOAST }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
        aria-hidden="true"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22,4 12,14.01 9,11.01" />
      </svg>
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}
