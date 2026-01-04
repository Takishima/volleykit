import { BookOpen } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { HELP_SITE_URL } from "@/utils/constants";

export function HelpSection() {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen
            className="w-5 h-5 text-primary-600 dark:text-primary-400"
            aria-hidden="true"
          />
          <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
            {t("settings.help.title")}
          </h2>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-text-muted dark:text-text-muted-dark">
          {t("settings.help.description")}
        </p>
        <a
          href={HELP_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 underline underline-offset-2 text-sm transition-colors"
        >
          {t("settings.help.openDocs")} &rarr;
        </a>
      </CardContent>
    </Card>
  );
}
