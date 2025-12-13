import { useTabNavigation } from "@/hooks/useTabNavigation";

export interface Tab {
  id: string;
  label: string;
  badge?: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  ariaLabel: string;
  /** Optional content to render at the end of the tab bar (e.g., filters, toggles) */
  endContent?: React.ReactNode;
}

export function Tabs({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel,
  endContent,
}: TabsProps) {
  const { getTabProps } = useTabNavigation({
    tabs: tabs.map((tab) => tab.id),
    activeTab,
    onTabChange,
  });

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
      <div
        className="overflow-x-auto scrollbar-hide"
        role="tablist"
        aria-label={ariaLabel}
      >
        <div className="flex gap-1 min-w-max">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            const tabProps = getTabProps(tab.id, index);
            return (
              <button
                key={tab.id}
                {...tabProps}
                onClick={() => onTabChange(tab.id)}
                className={`
                  px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2
                  dark:focus-visible:ring-offset-gray-800
                  ${
                    isActive
                      ? "border-orange-500 text-orange-600 dark:text-orange-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  }
                `}
              >
                {tab.label}
                {tab.badge && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {endContent}
    </div>
  );
}

interface TabPanelProps {
  tabId: string;
  activeTab: string;
  children: React.ReactNode;
}

export function TabPanel({ tabId, activeTab, children }: TabPanelProps) {
  const isActive = activeTab === tabId;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${tabId}`}
      aria-labelledby={`tab-${tabId}`}
      hidden={!isActive}
    >
      {isActive && children}
    </div>
  );
}
