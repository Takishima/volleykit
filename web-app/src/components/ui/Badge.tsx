interface BadgeProps {
  children: React.ReactNode;
  variant?: "neutral" | "success" | "warning" | "danger";
  className?: string;
  title?: string;
}

const variantStyles = {
  neutral: "bg-surface-subtle text-text-secondary dark:bg-surface-subtle-dark dark:text-text-secondary-dark",
  success: "bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200",
  warning: "bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200",
  danger: "bg-danger-100 text-danger-800 dark:bg-danger-900 dark:text-danger-200",
} as const;

export function Badge({
  children,
  variant = "neutral",
  className = "",
  title,
}: BadgeProps) {
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-xs font-medium ${variantStyles[variant]} ${className}`}
      title={title}
    >
      {children}
    </span>
  );
}
