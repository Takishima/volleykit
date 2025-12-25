import type { ReactNode } from "react";

type TitleSize = "base" | "lg" | "xl";

interface ModalHeaderProps {
  /** Modal title text */
  title: string;
  /** ID for the title element (must match Modal's titleId) */
  titleId: string;
  /** Optional icon to display before the title */
  icon?: ReactNode;
  /** Optional subtitle or additional content below the title */
  subtitle?: ReactNode;
  /** Title text size variant */
  titleSize?: TitleSize;
}

const titleSizeClasses: Record<TitleSize, string> = {
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

/**
 * Header component for modals with title and optional icon.
 *
 * @example
 * ```tsx
 * // Simple title
 * <ModalHeader
 *   title="Edit Settings"
 *   titleId="edit-settings-title"
 * />
 *
 * // With icon
 * <ModalHeader
 *   title="Export PDF"
 *   titleId="pdf-export-title"
 *   icon={
 *     <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
 *       <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
 *     </div>
 *   }
 * />
 *
 * // With subtitle
 * <ModalHeader
 *   title="Confirm Action"
 *   titleId="confirm-action-title"
 *   subtitle="Team A vs Team B"
 * />
 * ```
 */
export function ModalHeader({
  title,
  titleId,
  icon,
  subtitle,
  titleSize = "xl",
}: ModalHeaderProps) {
  return (
    <div className="mb-4">
      <div className={icon ? "flex items-center gap-3" : undefined}>
        {icon}
        <h2
          id={titleId}
          className={`${titleSizeClasses[titleSize]} font-semibold text-text-primary dark:text-text-primary-dark`}
        >
          {title}
        </h2>
      </div>
      {subtitle && (
        <div className="mt-1 text-sm text-text-muted dark:text-text-muted-dark">
          {subtitle}
        </div>
      )}
    </div>
  );
}
