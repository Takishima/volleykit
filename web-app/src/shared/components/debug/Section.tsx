import { useId } from 'react'

export function Section({
  id,
  title,
  expanded,
  onToggle,
  children,
}: {
  id: string
  title: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const contentId = useId()
  const fullContentId = `debug-section-${id}-${contentId}`

  return (
    <div
      style={{
        marginBottom: '4px',
        backgroundColor: '#111122',
        borderRadius: '4px',
        border: '1px solid #222',
      }}
    >
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={fullContentId}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 8px',
          background: 'none',
          border: 'none',
          color: '#888',
          cursor: 'pointer',
          fontSize: '9px',
          textAlign: 'left',
        }}
      >
        <span>{title}</span>
        <span style={{ color: '#444' }}>{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <div id={fullContentId} style={{ padding: '4px 8px 8px', borderTop: '1px solid #222' }}>
          {children}
        </div>
      )}
    </div>
  )
}
