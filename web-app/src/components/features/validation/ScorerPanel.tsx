import { useState } from "react";
import type { ValidatedPersonSearchResult } from "@/api/validation";
import { ScorerSearchPanel } from "./ScorerSearchPanel";

interface ScorerPanelProps {
  onScorerChange?: (scorer: ValidatedPersonSearchResult | null) => void;
  initialScorer?: ValidatedPersonSearchResult | null;
}

/**
 * Scorer panel wrapper that manages the selected scorer state.
 * Use this when you want the panel to manage its own state.
 * For controlled usage, use ScorerSearchPanel directly.
 */
export function ScorerPanel({
  onScorerChange,
  initialScorer = null,
}: ScorerPanelProps) {
  const [selectedScorer, setSelectedScorer] =
    useState<ValidatedPersonSearchResult | null>(initialScorer);

  const handleScorerSelect = (scorer: ValidatedPersonSearchResult | null) => {
    setSelectedScorer(scorer);
    onScorerChange?.(scorer);
  };

  return (
    <ScorerSearchPanel
      selectedScorer={selectedScorer}
      onScorerSelect={handleScorerSelect}
    />
  );
}
