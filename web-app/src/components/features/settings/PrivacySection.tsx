import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export function PrivacySection() {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
          {t("settings.privacy")}
        </h2>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-text-muted dark:text-text-muted-dark">
        <p>{t("settings.privacyNoCollection")}</p>
        <p>{t("settings.privacyDirectComm")}</p>
        <p>{t("settings.privacyNoAnalytics")}</p>
      </CardContent>
    </Card>
  );
}
