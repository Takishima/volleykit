import { useTranslation } from "@/shared/hooks/useTranslation";
import { Card, CardContent, CardHeader } from "@/shared/components/Card";
import { Button } from "@/shared/components/Button";

// Build OCR POC URL relative to the app's base path
// In dev: BASE_URL is "/" → "/ocr-poc/"
// In PR preview: BASE_URL is "/volleykit/pr-123/" → "/volleykit/pr-123/ocr-poc/"
const OCR_POC_URL = `${import.meta.env.BASE_URL}ocr-poc/`;

export function ExperimentalSection() {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
          {t("settings.experimental.title")}
        </h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-text-muted dark:text-text-muted-dark">
          {t("settings.experimental.description")}
        </p>

        <div className="border-t border-border-subtle dark:border-border-subtle-dark pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium text-text-primary dark:text-text-primary-dark">
                {t("settings.experimental.ocrPoc")}
              </p>
              <p className="text-sm text-text-muted dark:text-text-muted-dark">
                {t("settings.experimental.ocrPocDescription")}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => window.open(OCR_POC_URL, "_blank", "noopener,noreferrer")}
              aria-label={t("settings.experimental.openOcrPoc")}
            >
              {t("settings.experimental.openOcrPoc")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
