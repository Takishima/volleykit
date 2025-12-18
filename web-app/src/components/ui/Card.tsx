import { type ReactNode, type KeyboardEvent } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  role?: string;
  tabIndex?: number;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
}

export function Card({
  children,
  className = "",
  onClick,
  onKeyDown,
  role,
  tabIndex,
  "aria-label": ariaLabel,
  "aria-expanded": ariaExpanded,
}: CardProps) {
  const baseClasses =
    "bg-surface-card dark:bg-surface-card-dark rounded-xl shadow-sm border border-border-subtle dark:border-border-subtle-dark/50";
  const interactiveClasses = onClick
    ? "cursor-pointer hover:shadow-md hover:border-border-strong dark:hover:border-border-strong-dark transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-surface-page-dark"
    : "";

  return (
    <div
      className={`${baseClasses} ${interactiveClasses} ${className}`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={role ?? (onClick ? "button" : undefined)}
      tabIndex={tabIndex ?? (onClick ? 0 : undefined)}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return (
    <div
      className={`px-4 py-3 border-b border-border-subtle dark:border-border-subtle-dark ${className}`}
    >
      {children}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div
      className={`px-4 py-3 border-t border-border-subtle dark:border-border-subtle-dark ${className}`}
    >
      {children}
    </div>
  );
}
