import { useCallback, memo } from "react";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Card, CardContent, CardHeader } from "@/shared/components/Card";
import { LanguageSwitcher } from "@/shared/components/LanguageSwitcher";

interface PreferencesSectionProps {
  preventZoom: boolean;
  onSetPreventZoom: (enabled: boolean) => void;
}

function PreferencesSectionComponent({
  preventZoom,
  onSetPreventZoom,
}: PreferencesSectionProps) {
  const { t } = useTranslation();

  const handleTogglePreventZoom = useCallback(() => {
    onSetPreventZoom(!preventZoom);
  }, [preventZoom, onSetPreventZoom]);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
          {t("settings.preferences.title")}
        </h2>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language selection */}
        <div data-tour="language-switcher">
          <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark mb-2">
            {t("settings.language")}
          </div>
          <LanguageSwitcher variant="grid" />
        </div>

        {/* Separator */}
        <div className="border-t border-border-subtle dark:border-border-subtle-dark" />

        {/* Accessibility: Prevent Zoom Toggle */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
            {t("settings.accessibility.title")}
          </div>
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            {t("settings.accessibility.description")}
          </p>

          <div className="flex items-center justify-between py-2">
            <div className="flex-1">
              <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                {t("settings.accessibility.preventZoom")}
              </div>
              <div className="text-xs text-text-muted dark:text-text-muted-dark mt-1">
                {t("settings.accessibility.preventZoomDescription")}
              </div>
            </div>

            <button
              type="button"
              onClick={handleTogglePreventZoom}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                preventZoom
                  ? "bg-primary-600"
                  : "bg-surface-muted dark:bg-surface-subtle-dark"
              }`}
              role="switch"
              aria-checked={preventZoom}
              aria-label={t("settings.accessibility.preventZoom")}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preventZoom ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="text-xs text-text-muted dark:text-text-muted-dark">
            {preventZoom
              ? t("settings.accessibility.preventZoomEnabled")
              : t("settings.accessibility.preventZoomDisabled")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const PreferencesSection = memo(PreferencesSectionComponent);
