/* eslint-disable @typescript-eslint/no-magic-numbers -- Debug panel uses inline styles with pixel values */
import { copyToClipboard, STORAGE_KEY, type PersistedState } from './debug-utils'

export function RawStorageSection({ persistedState }: { persistedState: PersistedState | null }) {
  const handleCopy = async () => {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) {
      alert('No data in localStorage')
      return
    }

    const success = await copyToClipboard(data)
    if (success) {
      alert('Copied to clipboard!')
    } else {
      // Show data in alert as fallback
      alert('Copy failed. Data (truncated):\n' + data.substring(0, 500) + '...')
    }
  }

  const handleClear = () => {
    if (confirm('This will clear auth state and require re-login. Continue?')) {
      localStorage.removeItem(STORAGE_KEY)
      window.location.reload()
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        <button
          onClick={handleCopy}
          style={{
            padding: '4px 8px',
            fontSize: '9px',
            cursor: 'pointer',
            backgroundColor: '#1a1a2e',
            border: '1px solid #444',
            color: '#888',
            borderRadius: '4px',
          }}
        >
          Copy Full JSON
        </button>
        <button
          onClick={handleClear}
          style={{
            padding: '4px 8px',
            fontSize: '9px',
            cursor: 'pointer',
            backgroundColor: '#2e0a0a',
            border: '1px solid #5e1a1a',
            color: '#ff6b6b',
            borderRadius: '4px',
          }}
        >
          Clear & Reload
        </button>
      </div>
      <pre
        style={{
          fontSize: '8px',
          color: '#666',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          maxHeight: '100px',
          overflow: 'auto',
          backgroundColor: '#0a0a15',
          padding: '4px',
          borderRadius: '4px',
        }}
      >
        {JSON.stringify(persistedState, null, 1)?.substring(0, 1000)}...
      </pre>
    </>
  )
}
