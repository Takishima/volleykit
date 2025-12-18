import { useState } from "react";
import { usePWA } from "@/contexts/PWAContext";

export default function ReloadPromptPWA() {
  const { offlineReady, needRefresh, updateApp, dismissPrompt } = usePWA();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!offlineReady && !needRefresh) {
    return null;
  }

  const handleReload = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await updateApp();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-white p-4 shadow-lg ring-1 ring-black/5"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">
            {offlineReady
              ? "App ready for offline use"
              : "New version available"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {offlineReady
              ? "Content has been cached for offline access."
              : "Click reload to update to the latest version."}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {needRefresh && (
          <button
            onClick={handleReload}
            disabled={isUpdating}
            aria-busy={isUpdating}
            className="rounded-md bg-primary-500 px-3 py-2 text-sm font-medium text-primary-950 hover:bg-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Reload application to update to the latest version"
          >
            {isUpdating ? "Reloading..." : "Reload"}
          </button>
        )}
        <button
          onClick={dismissPrompt}
          className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none"
          aria-label={
            needRefresh ? "Dismiss update notification" : "Close notification"
          }
        >
          {needRefresh ? "Dismiss" : "Close"}
        </button>
      </div>
    </div>
  );
}
