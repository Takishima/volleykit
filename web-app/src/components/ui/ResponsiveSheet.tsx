import { useCallback, useEffect } from "react";

interface ResponsiveSheetProps {
  isOpen: boolean;
  onClose: () => void;
  titleId: string;
  children: React.ReactNode;
}

export function ResponsiveSheet({
  isOpen,
  onClose,
  titleId,
  children,
}: ResponsiveSheetProps) {
  // Lock body scroll when sheet is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        aria-hidden="true"
        onClick={handleBackdropClick}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="
          fixed inset-x-0 bottom-0
          md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
          max-h-[80vh] md:max-h-[70vh] md:max-w-lg md:w-full
          bg-surface-card dark:bg-surface-card-dark rounded-t-xl md:rounded-lg
          shadow-xl flex flex-col
          animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:fade-in
          duration-200
        "
      >
        {children}
      </div>
    </div>
  );
}
