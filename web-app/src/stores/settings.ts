import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  isSafeModeEnabled: boolean;
  setSafeMode: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      isSafeModeEnabled: true,

      setSafeMode: (enabled: boolean) => {
        set({ isSafeModeEnabled: enabled });
      },
    }),
    {
      name: "volleykit-settings",
      partialize: (state) => ({
        isSafeModeEnabled: state.isSafeModeEnabled,
      }),
    },
  ),
);
