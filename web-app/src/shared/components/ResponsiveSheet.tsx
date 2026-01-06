import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useModalDismissal } from "@/shared/hooks/useModalDismissal";

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
  // Lock body scroll when sheet is open (iOS-compatible approach)
  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const originalStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = originalStyles.overflow;
      document.body.style.position = originalStyles.position;
      document.body.style.top = originalStyles.top;
      document.body.style.width = originalStyles.width;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  const { handleBackdropClick } = useModalDismissal({
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[55]">
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
    </div>,
    document.body,
  );
}
