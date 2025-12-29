import { useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { FileText } from 'lucide-react';
import type { Language } from '@/utils/pdf-form-filler';
import { Modal } from '@/components/ui/Modal';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { ModalFooter } from '@/components/ui/ModalFooter';
import { Button } from '@/components/ui/Button';

const MODAL_TITLE_ID = 'pdf-lang-title';

interface PdfLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (language: Language) => void;
  isLoading?: boolean;
  defaultLanguage?: Language;
}

const LANGUAGES: Array<{ code: Language; name: string }> = [
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
];

export function PdfLanguageModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  defaultLanguage = 'de',
}: PdfLanguageModalProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Language>(defaultLanguage);

  useEffect(() => {
    if (isOpen) setSelected(defaultLanguage); // eslint-disable-line react-hooks/set-state-in-effect
  }, [isOpen, defaultLanguage]);

  const pdfIcon = (
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titleId={MODAL_TITLE_ID}
      size="sm"
      isLoading={isLoading}
    >
      <ModalHeader
        title={t('pdf.exportTitle')}
        titleId={MODAL_TITLE_ID}
        titleSize="lg"
        icon={pdfIcon}
      />

      <p className="text-sm text-text-secondary dark:text-text-secondary-dark mb-4">
        {t('pdf.selectLanguage')}
      </p>

      <div className="space-y-2 mb-6">
        {LANGUAGES.map(({ code, name }) => (
          <label
            key={code}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              selected === code
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-border-default dark:border-border-default-dark hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark'
            }`}
          >
            <input
              type="radio"
              name="pdf-lang"
              value={code}
              checked={selected === code}
              onChange={() => setSelected(code)}
              className="w-4 h-4 text-blue-600"
              disabled={isLoading}
            />
            <span className="text-text-primary dark:text-text-primary-dark">{name}</span>
          </label>
        ))}
      </div>

      <ModalFooter>
        <Button variant="secondary" className="flex-1" onClick={onClose} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="blue"
          className="flex-1"
          onClick={() => onConfirm(selected)}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t('pdf.generating')}
            </>
          ) : (
            t('pdf.export')
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
