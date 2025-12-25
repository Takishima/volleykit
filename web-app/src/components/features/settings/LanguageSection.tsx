import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

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
