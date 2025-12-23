import { useState, useEffect } from "react";
import type { ValidatedPersonSearchResult } from "@/api/validation";
import { ScorerSearchPanel } from "./ScorerSearchPanel";

interface ScorerPanelProps {
  onScorerChange?: (scorer: ValidatedPersonSearchResult | null) => void;
  initialScorer?: ValidatedPersonSearchResult | null;
  /** When true, shows scorer in view-only mode without edit controls */
  readOnly?: boolean;
  /** Scorer name to display in read-only mode when no scorer data is available */
  readOnlyScorerName?: string;
}

/**
 * Scorer panel wrapper that manages the selected scorer state.
 * Use this when you want the panel to manage its own state.
 * For controlled usage, use ScorerSearchPanel directly.
 */
export function ScorerPanel({
  onScorerChange,
  initialScorer = null,
  readOnly = false,
  readOnlyScorerName,
}: ScorerPanelProps) {
  const [selectedScorer, setSelectedScorer] =
    useState<ValidatedPersonSearchResult | null>(initialScorer);

  // Notify parent of initial scorer on mount (so completionStatus is updated)
  useEffect(() => {
    if (initialScorer) {
      onScorerChange?.(initialScorer);
    }
    // Only run on mount - when key changes, component remounts with new initialScorer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScorerSelect = (scorer: ValidatedPersonSearchResult | null) => {
    setSelectedScorer(scorer);
    onScorerChange?.(scorer);
  };

  return (
    <ScorerSearchPanel
      selectedScorer={selectedScorer}
      onScorerSelect={handleScorerSelect}
      readOnly={readOnly}
      readOnlyScorerName={readOnlyScorerName}
    />
  );
}
