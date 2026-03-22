export function DebugHeader({
  onRefresh,
  onClose,
}: {
  onRefresh: () => void
  onClose: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px',
        borderBottom: '1px solid #333',
        paddingBottom: '4px',
      }}
    >
      <strong style={{ color: '#00d4ff', fontSize: '11px' }}>VolleyKit Debug Panel</strong>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onRefresh}
          style={{
            background: '#1a1a2e',
            border: '1px solid #444',
            color: '#888',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '9px',
          }}
          aria-label="Refresh persisted state"
        >
          Refresh
        </button>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#ff6b6b',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          aria-label="Close debug panel"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
