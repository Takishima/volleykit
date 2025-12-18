interface BadgeProps {
  children: React.ReactNode;
  variant?: "neutral" | "success" | "warning" | "danger";
  className?: string;
  title?: string;
}

const variantStyles = {
  neutral: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  danger: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
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
