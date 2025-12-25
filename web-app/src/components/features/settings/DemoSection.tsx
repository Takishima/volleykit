import { useState, useCallback, useRef, useEffect, memo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const DEMO_RESET_MESSAGE_DURATION_MS = 3000;

interface DemoSectionProps {
  activeAssociationCode: string | null;
  onRefreshData: () => void;
}

function DemoSectionComponent({ activeAssociationCode, onRefreshData }: DemoSectionProps) {
  const { t } = useTranslation();
  const [demoDataReset, setDemoDataReset] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const handleResetDemoData = useCallback(() => {
    onRefreshData();
    setDemoDataReset(true);
    // Clear any existing timeout before setting a new one
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    resetTimeoutRef.current = setTimeout(
      () => setDemoDataReset(false),
      DEMO_RESET_MESSAGE_DURATION_MS,
    );
  }, [onRefreshData]);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
          {t("settings.demoData")}
        </h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-text-muted dark:text-text-muted-dark">
          {t("settings.demoDataDescription")}
        </p>

        <div className="flex items-center justify-between py-2">
          <div className="flex-1">
            {demoDataReset && (
              <div
                className="text-sm font-medium text-success-600 dark:text-success-400"
                role="status"
                aria-live="polite"
              >
                {t("settings.demoDataReset")}
              </div>
            )}
            {activeAssociationCode && !demoDataReset && (
              <div className="text-sm text-text-muted dark:text-text-muted-dark">
                {activeAssociationCode}
              </div>
            )}
          </div>

          <Button
            variant="secondary"
            onClick={handleResetDemoData}
            aria-label={t("settings.resetDemoData")}
          >
            {t("settings.resetDemoData")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export const DemoSection = memo(DemoSectionComponent);
