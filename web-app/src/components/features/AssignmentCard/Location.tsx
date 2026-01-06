import {
  MapPin,
  TrainFront,
  Loader2,
  Navigation,
} from "@/components/ui/icons";
import { useTranslation } from "@/hooks/useTranslation";
import { useAssignmentCardContext } from "./context";

/** Displays hall location with address and navigation buttons in details view */
export function Location() {
  const { t, tInterpolate } = useTranslation();
  const {
    hallName,
    fullAddress,
    addressMapsUrl,
    googleMapsUrl,
    showSbbButton,
    isSbbLoading,
    openSbbConnection,
  } = useAssignmentCardContext();

  return (
    <div className="flex items-start gap-2 text-sm text-text-muted dark:text-text-muted-dark pt-2">
      <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-text-primary dark:text-text-primary-dark">
          {hallName}
        </div>
        {fullAddress &&
          (addressMapsUrl ? (
            <a
              href={addressMapsUrl}
              className="text-primary-600 dark:text-primary-400 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded block"
              onClick={(e) => e.stopPropagation()}
              aria-label={tInterpolate("assignments.openAddressInMaps", {
                address: fullAddress,
              })}
            >
              {fullAddress}
            </a>
          ) : (
            <span>{fullAddress}</span>
          ))}
      </div>
      {/* Navigation buttons */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg transition-colors"
            onClick={(e) => e.stopPropagation()}
            title={t("assignments.openInGoogleMaps")}
            aria-label={t("assignments.openInGoogleMaps")}
          >
            <Navigation className="w-5 h-5" aria-hidden="true" />
          </a>
        )}
        {showSbbButton && (
          <button
            type="button"
            className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg transition-colors disabled:opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              void openSbbConnection();
            }}
            disabled={isSbbLoading}
            title={t("assignments.openSbbConnection")}
            aria-label={t("assignments.openSbbConnection")}
          >
            {isSbbLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : (
              <TrainFront className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
