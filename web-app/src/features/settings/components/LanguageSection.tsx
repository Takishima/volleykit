import { useTranslation } from "@/shared/hooks/useTranslation";
import { Card, CardContent, CardHeader } from "@/shared/components/Card";
import { LanguageSwitcher } from "@/shared/components/LanguageSwitcher";

export function LanguageSection() {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
          {t("settings.language")}
        </h2>
      </CardHeader>
      <CardContent data-tour="language-switcher">
        <LanguageSwitcher variant="grid" />
      </CardContent>
    </Card>
  );
}
