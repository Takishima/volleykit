interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-3",
  lg: "w-12 h-12 border-4",
};

export function LoadingSpinner({
  size = "md",
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div
      className={`
        ${sizeClasses[size]}
        border-gray-200 border-t-orange-500
        rounded-full animate-spin
        ${className}
      `}
      role="status"
      aria-label="Loading"
    />
  );
}

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-gray-500 dark:text-gray-400 text-sm">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="text-4xl">⚠️</div>
      <p className="text-red-600 dark:text-red-400 text-center">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-secondary">
          Try Again
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon = "📭",
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <div className="text-5xl">{icon}</div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {title}
      </h3>
      {description && (
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md">
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
