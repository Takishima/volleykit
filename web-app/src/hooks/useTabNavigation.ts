import { useCallback, useRef } from "react";

interface UseTabNavigationOptions<T extends string> {
  tabs: readonly T[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
}

/**
 * Hook for implementing keyboard navigation in WAI-ARIA tab patterns.
 * Provides ref management and keyboard handlers for arrow key navigation.
 */
export function useTabNavigation<T extends string>({
  tabs,
  activeTab,
  onTabChange,
}: UseTabNavigationOptions<T>) {
  const tabRefs = useRef<Map<T, HTMLButtonElement>>(new Map());

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      let nextIndex: number | null = null;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = tabs.length - 1;
      }

      if (nextIndex !== null) {
        const nextTab = tabs[nextIndex];
        if (nextTab) {
          onTabChange(nextTab);
          tabRefs.current.get(nextTab)?.focus();
        }
      }
    },
    [tabs, onTabChange],
  );

  const setTabRef = useCallback(
    (tabId: T) => (el: HTMLButtonElement | null) => {
      if (el) {
        tabRefs.current.set(tabId, el);
      } else {
        tabRefs.current.delete(tabId);
      }
    },
    [],
  );

  const getTabProps = useCallback(
    (tabId: T, index: number) => ({
      ref: setTabRef(tabId),
      role: "tab" as const,
      // ID format used by E2E tests for locale-independent tab selection
      id: `tab-${tabId}`,
      "aria-selected": activeTab === tabId,
      "aria-controls": `tabpanel-${tabId}`,
      tabIndex: activeTab === tabId ? 0 : -1,
      onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) =>
        handleKeyDown(e, index),
    }),
    [activeTab, handleKeyDown, setTabRef],
  );

  return { getTabProps };
}
