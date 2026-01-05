import { useTranslation } from "@/hooks/useTranslation";
import { UserPlus, X } from "@/components/ui/icons";
import type { Schemas } from "@/api/client";
import type { CoachRole } from "@/hooks/useNominationList";

type PersonSummary = Schemas["PersonSummary"];

interface CoachesSectionProps {
  headCoach: PersonSummary | null | undefined;
  firstAssistant: PersonSummary | null | undefined;
  secondAssistant: PersonSummary | null | undefined;
  /** When true, hides edit controls */
  readOnly?: boolean;
  /** Callback when user wants to add/change a coach */
  onAddCoach?: (role: CoachRole) => void;
  /** Callback when user wants to remove a coach */
  onRemoveCoach?: (role: CoachRole) => void;
  /** Map of roles to pending additions (person to be added) */
  pendingAdditions?: Map<CoachRole, PersonSummary>;
  /** Set of roles with pending removals */
  pendingRemovals?: Set<CoachRole>;
}

interface CoachRowProps {
  label: string;
  person: PersonSummary | null | undefined;
  coachRole: CoachRole;
  readOnly: boolean;
  isPendingAddition?: boolean;
  isPendingRemoval?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
}

function CoachRow({
  label,
  person,
  coachRole,
  readOnly,
  isPendingAddition,
  isPendingRemoval,
  onAdd,
  onRemove,
}: CoachRowProps) {
  const { t } = useTranslation();
  const hasCoach = person != null;
  const displayName = person?.displayName ?? t("validation.roster.notAssigned");

  // Determine visual state
  const isMarkedForRemoval = isPendingRemoval && hasCoach;
  const isNewlyAdded = isPendingAddition;

  return (
    <div
      className={`
        flex items-center justify-between py-2 px-3
        ${isMarkedForRemoval ? "bg-danger-50 dark:bg-danger-900/20" : ""}
        ${isNewlyAdded ? "bg-success-50 dark:bg-success-900/20" : ""}
      `}
      data-testid={`coach-row-${coachRole}`}
    >
      <div className="flex-1 min-w-0">
        <span className="text-xs text-text-muted dark:text-text-muted-dark uppercase tracking-wide">
          {label}
        </span>
        <p
          className={`
            text-sm truncate
            ${isMarkedForRemoval ? "line-through text-danger-600 dark:text-danger-400" : ""}
            ${isNewlyAdded ? "text-success-700 dark:text-success-400 font-medium" : ""}
            ${!hasCoach && !isNewlyAdded ? "text-text-muted dark:text-text-muted-dark italic" : "text-text-primary dark:text-text-primary-dark"}
          `}
        >
          {displayName}
        </p>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-1 ml-2">
          {/* Remove button - shown when coach exists and not pending removal */}
          {hasCoach && !isMarkedForRemoval && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={t("validation.roster.removeCoach")}
              className="p-1.5 rounded-md text-text-muted hover:text-danger-600 hover:bg-danger-50 dark:hover:text-danger-400 dark:hover:bg-danger-900/30 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}

          {/* Undo removal button */}
          {isMarkedForRemoval && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={t("validation.roster.undoRemoval")}
              className="text-xs px-2 py-1 rounded-md text-danger-600 hover:bg-danger-100 dark:text-danger-400 dark:hover:bg-danger-900/40 transition-colors"
            >
              {t("validation.roster.undoRemoval")}
            </button>
          )}

          {/* Add/Change button - shown when no coach or as change option */}
          {!hasCoach && !isNewlyAdded && (
            <button
              type="button"
              onClick={onAdd}
              aria-label={t("validation.roster.addCoach")}
              className="p-1.5 rounded-md text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/30 transition-colors"
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function CoachesSection({
  headCoach,
  firstAssistant,
  secondAssistant,
  readOnly = false,
  onAddCoach,
  onRemoveCoach,
  pendingAdditions,
  pendingRemovals,
}: CoachesSectionProps) {
  const { t } = useTranslation();

  // Get effective coaches (considering pending additions)
  const effectiveHeadCoach = pendingAdditions?.get("head") ?? headCoach;
  const effectiveFirstAssistant = pendingAdditions?.get("firstAssistant") ?? firstAssistant;
  const effectiveSecondAssistant = pendingAdditions?.get("secondAssistant") ?? secondAssistant;

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700"
      role="list"
      aria-label={t("validation.roster.coaches")}
    >
      <CoachRow
        label={t("validation.roster.headCoach")}
        person={effectiveHeadCoach}
        coachRole="head"
        readOnly={readOnly}
        isPendingAddition={pendingAdditions?.has("head")}
        isPendingRemoval={pendingRemovals?.has("head")}
        onAdd={() => onAddCoach?.("head")}
        onRemove={() => onRemoveCoach?.("head")}
      />
      <CoachRow
        label={t("validation.roster.firstAssistant")}
        person={effectiveFirstAssistant}
        coachRole="firstAssistant"
        readOnly={readOnly}
        isPendingAddition={pendingAdditions?.has("firstAssistant")}
        isPendingRemoval={pendingRemovals?.has("firstAssistant")}
        onAdd={() => onAddCoach?.("firstAssistant")}
        onRemove={() => onRemoveCoach?.("firstAssistant")}
      />
      <CoachRow
        label={t("validation.roster.secondAssistant")}
        person={effectiveSecondAssistant}
        coachRole="secondAssistant"
        readOnly={readOnly}
        isPendingAddition={pendingAdditions?.has("secondAssistant")}
        isPendingRemoval={pendingRemovals?.has("secondAssistant")}
        onAdd={() => onAddCoach?.("secondAssistant")}
        onRemove={() => onRemoveCoach?.("secondAssistant")}
      />
    </div>
  );
}
