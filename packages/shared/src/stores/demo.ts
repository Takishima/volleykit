/**
 * Demo mode store - For testing without API access
 *
 * This will be extracted from web-app/src/shared/stores/demo/
 * Placeholder for now - implementation in Phase 2
 */

import { create } from 'zustand';

export interface DemoState {
  isDemoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
}

export const useDemoStore = create<DemoState>((set) => ({
  isDemoMode: false,
  setDemoMode: (isDemoMode) => set({ isDemoMode }),
}));
