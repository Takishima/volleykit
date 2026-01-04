/**
 * Dropdown for filtering calendar assignments by regional association.
 *
 * This component provides a filter UI similar to the occupation switcher
 * in API mode, but for filtering by association codes extracted from
 * calendar data (e.g., SVRZ, SVRBA, SVRI).
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from '@/components/ui/icons';
import { useTranslation } from '@/hooks/useTranslation';
import { ALL_ASSOCIATIONS } from '@/hooks/useCalendarAssociationFilter';

interface CalendarAssociationDropdownProps {
  /** List of available associations to filter by */
  associations: string[];

  /** Currently selected association (or ALL_ASSOCIATIONS for all) */
  selected: string;

  /** Callback when selection changes */
  onChange: (association: string) => void;
}

/**
 * Dropdown component for filtering calendar assignments by association.
 *
 * Only renders when there are 2+ associations available.
 *
 * @example
 * ```tsx
 * <CalendarAssociationDropdown
 *   associations={['SVRBA', 'SVRZ']}
 *   selected={selectedAssociation}
 *   onChange={setSelectedAssociation}
 * />
 * ```
 */
export function CalendarAssociationDropdown({
  associations,
  selected,
  onChange,
}: CalendarAssociationDropdownProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render if only one or no associations
  if (associations.length < 2) {
    return null;
  }

  const getDisplayLabel = (value: string): string => {
    if (value === ALL_ASSOCIATIONS) {
      return t('calendar.allAssociations');
    }
    return value;
  };

  const handleSelect = (value: string) => {
    onChange(value);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg
          transition-colors border
          ${
            selected === ALL_ASSOCIATIONS
              ? 'text-text-secondary dark:text-text-secondary-dark bg-surface-subtle dark:bg-surface-subtle-dark border-border-default dark:border-border-default-dark'
              : 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800'
          }
          hover:bg-primary-100 dark:hover:bg-primary-900/50
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t('calendar.filterByAssociation')}
      >
        <span>{getDisplayLabel(selected)}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 mt-1 w-40 bg-surface-card dark:bg-surface-card-dark rounded-lg shadow-lg border border-border-default dark:border-border-default-dark py-1 z-50"
          role="listbox"
          aria-label={t('calendar.selectAssociation')}
        >
          {/* All option */}
          <button
            onClick={() => handleSelect(ALL_ASSOCIATIONS)}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              selected === ALL_ASSOCIATIONS
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'text-text-secondary dark:text-text-secondary-dark hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark'
            }`}
            role="option"
            aria-selected={selected === ALL_ASSOCIATIONS}
          >
            {t('calendar.allAssociations')}
          </button>

          {/* Association options */}
          {associations.map((association) => (
            <button
              key={association}
              onClick={() => handleSelect(association)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                selected === association
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-text-secondary dark:text-text-secondary-dark hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark'
              }`}
              role="option"
              aria-selected={selected === association}
            >
              {association}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
