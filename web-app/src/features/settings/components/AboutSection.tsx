import { useTranslation } from "@/shared/hooks/useTranslation";
import { Card, CardContent, CardHeader } from "@/shared/components/Card";

export function AboutSection() {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
          {t("settings.about")}
        </h2>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted dark:text-text-muted-dark">
            {t("settings.version")}
          </span>
          <span className="text-text-primary dark:text-text-primary-dark">{__APP_VERSION__}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted dark:text-text-muted-dark">
            {t("settings.platform")}
          </span>
          <span className="text-text-primary dark:text-text-primary-dark">Web</span>
        </div>
        <div className="border-t border-border-subtle dark:border-border-subtle-dark pt-3 mt-3">
          <a
            href="https://volleymanager.volleyball.ch"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            {t("settings.openWebsite")} →
          </a>
        </div>
        <div className="border-t border-border-subtle dark:border-border-subtle-dark pt-3 mt-3 space-y-2">
          <p className="text-text-muted dark:text-text-muted-dark">
            {t("settings.dataSource")}
          </p>
          <p className="text-xs text-text-subtle dark:text-text-subtle-dark">
            {t("settings.disclaimer")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
