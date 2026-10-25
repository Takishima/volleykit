import { type ReactNode, type KeyboardEvent } from 'react'

interface BaseCardProps {
  children: ReactNode
  className?: string
  'aria-label'?: string
  'aria-expanded'?: boolean
  'data-tour'?: string
}

/** A plain container card */
interface StaticCardProps extends BaseCardProps {
  onClick?: undefined
  onKeyDown?: undefined
  tabIndex?: undefined
}

/** A clickable card, exposed as a button to assistive technology */
interface InteractiveCardProps extends BaseCardProps {
  onClick: () => void
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void
  tabIndex?: number
}

type CardProps = StaticCardProps | InteractiveCardProps

const BASE_CLASSES =
  'bg-surface-card dark:bg-surface-card-dark rounded-xl shadow-sm border border-border-subtle dark:border-border-subtle-dark/50'
const INTERACTIVE_CLASSES =
  'cursor-pointer hover:shadow-md hover:border-border-strong dark:hover:border-border-strong-dark transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-surface-page-dark'

export function Card(props: CardProps) {
  const {
    children,
    className = '',
    'aria-label': ariaLabel,
    'aria-expanded': ariaExpanded,
    'data-tour': dataTour,
  } = props

  if (!props.onClick) {
    return (
      <div
        className={`${BASE_CLASSES} ${className}`}
        aria-label={ariaLabel}
        aria-expanded={ariaExpanded}
        data-tour={dataTour}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      className={`${BASE_CLASSES} ${INTERACTIVE_CLASSES} ${className}`}
      onClick={props.onClick}
      onKeyDown={props.onKeyDown}
      role="button"
      tabIndex={props.tabIndex ?? 0}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      data-tour={dataTour}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div
      className={`px-4 py-3 border-b border-border-subtle dark:border-border-subtle-dark ${className}`}
    >
      {children}
    </div>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
  'data-tour'?: string
}

export function CardContent({ children, className = '', 'data-tour': dataTour }: CardContentProps) {
  return (
    <div className={`p-4 ${className}`} data-tour={dataTour}>
      {children}
    </div>
  )
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div
      className={`px-4 py-3 border-t border-border-subtle dark:border-border-subtle-dark ${className}`}
    >
      {children}
    </div>
  )
}
