import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { FileText } from 'lucide-react';
import type { Language } from '@/utils/pdf-form-filler';

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

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, isLoading, onClose]);

  const onBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && !isLoading) onClose();
    },
    [isLoading, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onBackdrop}
      aria-hidden="true"
    >
      <div
        className="bg-surface-card dark:bg-surface-card-dark rounded-lg shadow-xl max-w-sm w-full p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-lang-title"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </div>
          <h2
            id="pdf-lang-title"
            className="text-lg font-semibold text-text-primary dark:text-text-primary-dark"
          >
            {t('pdf.exportTitle')}
          </h2>
        </div>
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

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-text-secondary dark:text-text-secondary-dark bg-surface-subtle dark:bg-surface-subtle-dark rounded-md hover:bg-surface-muted dark:hover:bg-surface-muted-dark focus:outline-none focus:ring-2 focus:ring-border-strong disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('pdf.generating')}
              </>
            ) : (
              t('pdf.export')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
