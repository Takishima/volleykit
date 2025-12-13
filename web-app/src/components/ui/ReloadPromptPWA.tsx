import { useRegisterSW } from "virtual:pwa-register/react";
import { useEffect, useRef } from "react";

export default function ReloadPromptPWA() {
  const intervalRef = useRef<number | undefined>(undefined);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (registration) {
        // Check for updates every hour
        intervalRef.current = setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000,
        ) as unknown as number;
      }
    },
    onRegisterError(error) {
      console.error("Service worker registration error:", error);
    },
  });

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) {
    return null;
  }

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
            onClick={() => updateServiceWorker(true)}
            className="rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none"
            aria-label="Reload application to update to the latest version"
          >
            Reload
          </button>
        )}
        <button
          onClick={close}
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
