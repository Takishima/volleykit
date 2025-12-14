import { useState } from "react";
import type { PersonSearchResult } from "@/api/client";
import { ScorerSearchPanel } from "./ScorerSearchPanel";

interface ScorerPanelProps {
  onScorerChange?: (scorer: PersonSearchResult | null) => void;
  initialScorer?: PersonSearchResult | null;
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
    useState<PersonSearchResult | null>(initialScorer);

  const handleScorerSelect = (scorer: PersonSearchResult | null) => {
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
