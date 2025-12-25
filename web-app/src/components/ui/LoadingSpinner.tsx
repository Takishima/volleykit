import type { ReactNode } from "react";
import { AlertTriangle, Calendar, Lock, Inbox, Wallet, ArrowLeftRight } from "@/components/ui/icons";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Optional aria-label override. Defaults to translated "Loading" */
  ariaLabel?: string;
}

// Size classes for spinner dimensions and border widths
// border-3 is a custom Tailwind class (3px) defined in tailwind.config
const sizeClasses = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-3",
  lg: "w-12 h-12 border-4",
};

export function LoadingSpinner({
  size = "md",
  className = "",
  ariaLabel,
}: LoadingSpinnerProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`
        ${sizeClasses[size]}
        border-border-default border-t-primary-500
        rounded-full animate-spin
        ${className}
      `}
      role="status"
      aria-label={ariaLabel ?? t("common.loading")}
    />
  );
}

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message }: LoadingStateProps) {
  const { t } = useTranslation();
  const displayMessage = message ?? t("common.loading");

  return (
    <div
      className="flex flex-col items-center justify-center py-12 gap-4"
      role="status"
      aria-label={displayMessage}
      data-testid="loading-state"
    >
      {/* Use visual-only spinner here since container has role="status" */}
      <div
        className={`
          ${sizeClasses.lg}
          border-border-default border-t-primary-500
          rounded-full animate-spin
        `}
        aria-hidden="true"
      />
      <p className="text-text-muted dark:text-text-muted-dark text-sm">{displayMessage}</p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4" role="alert">
      <AlertTriangle className="w-10 h-10 text-warning-500" aria-hidden="true" />
      <p className="text-danger-600 dark:text-danger-400 text-center">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-secondary">
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}

/** Map of icon names to Lucide components for EmptyState */
const EMPTY_STATE_ICONS: Record<string, LucideIcon> = {
  calendar: Calendar,
  lock: Lock,
  inbox: Inbox,
  wallet: Wallet,
  exchange: ArrowLeftRight,
};

interface EmptyStateProps {
  /** Icon identifier: 'calendar', 'lock', 'inbox', 'wallet', 'exchange', or a custom ReactNode */
  icon?: string | ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
}: EmptyStateProps) {
  const renderIcon = () => {
    if (typeof icon === "string") {
      const IconComponent = EMPTY_STATE_ICONS[icon];
      if (IconComponent) {
        return <IconComponent className="w-12 h-12 text-text-muted dark:text-text-muted-dark" aria-hidden="true" />;
      }
      // Fallback for unknown string icons
      return <Inbox className="w-12 h-12 text-text-muted dark:text-text-muted-dark" aria-hidden="true" />;
    }
    // Custom ReactNode passed directly
    return icon;
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      {renderIcon()}
      <h3 className="text-lg font-medium text-text-primary dark:text-text-primary-dark">
        {title}
      </h3>
      {description && (
        <p className="text-text-muted dark:text-text-muted-dark text-sm max-w-md">
          {description}
        </p>
      )}
      {action && (
        <button onClick={action.onClick} className="btn btn-primary mt-2">
          {action.label}
        </button>
      )}
    </div>
  );
}
