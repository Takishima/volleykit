import { useEffect } from 'react';
import { Modal } from '@/shared/components/Modal';
import { ModalHeader } from '@/shared/components/ModalHeader';
import { ModalFooter } from '@/shared/components/ModalFooter';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { launchConfetti } from '@/shared/utils/confetti';
import { PartyPopper, Stethoscope } from '@/shared/components/icons';

/** Duration of confetti animation in milliseconds */
const CONFETTI_DURATION_MS = 3000;

export type EasterEggType = 'ac3' | 'multipleDoctors';

interface EasterEggModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** The type of Easter egg to display */
  type: EasterEggType;
  /** Callback when the modal is closed */
  onClose: () => void;
}

/**
 * Modal that displays Easter egg messages when certain conditions are detected during OCR.
 *
 * Triggers:
 * - ac3: When a team has a third assistant coach (AC3)
 * - multipleDoctors: When a team has 2+ medical staff (M role)
 */
export function EasterEggModal({ isOpen, type, onClose }: EasterEggModalProps) {
  const { t } = useTranslation();

  // Launch confetti when modal opens
  useEffect(() => {
    if (isOpen) {
      launchConfetti(CONFETTI_DURATION_MS);
    }
  }, [isOpen]);

  const titleId = `easter-egg-${type}-title`;

  const getIcon = () => {
    switch (type) {
      case 'ac3':
        return (
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <PartyPopper
              className="w-6 h-6 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
          </div>
        );
      case 'multipleDoctors':
        return (
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Stethoscope
              className="w-6 h-6 text-red-600 dark:text-red-400"
              aria-hidden="true"
            />
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titleId={titleId}
      size="sm"
      zIndex={70}
    >
      <ModalHeader
        title={t(`easterEggs.${type}.title`)}
        titleId={titleId}
        icon={getIcon()}
      />

      <p className="text-text-secondary dark:text-text-secondary-dark mb-6">
        {t(`easterEggs.${type}.message`)}
      </p>

      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="w-full px-4 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
        >
          {t('easterEggs.dismiss')}
        </button>
      </ModalFooter>
    </Modal>
  );
}
