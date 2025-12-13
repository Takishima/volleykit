import { useAuthStore } from "@/stores/auth";
import { t } from "@/i18n";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { getOccupationLabelKey } from "@/utils/occupation-labels";

export function SettingsPage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {t("settings.title")}
      </h1>

      {/* Profile section */}
      {user && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {t("settings.profile")}
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-2xl">
                {user.firstName.charAt(0)}
                {user.lastName.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {user.firstName} {user.lastName}
                </div>
                {user.email && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                  </div>
                )}
              </div>
            </div>

            {user.occupations && user.occupations.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {t("settings.roles")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.occupations.map((occ) => (
                    <span
                      key={occ.id}
                      className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
                    >
                      {t(getOccupationLabelKey(occ.type))}
                      {occ.associationCode && ` (${occ.associationCode})`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Language section */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {t("settings.language")}
          </h2>
        </CardHeader>
        <CardContent>
          <LanguageSwitcher variant="grid" />
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {t("settings.privacy")}
          </h2>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
          <p>{t("settings.privacyNoCollection")}</p>
          <p>{t("settings.privacyDirectComm")}</p>
          <p>{t("settings.privacyNoAnalytics")}</p>
        </CardContent>
      </Card>

      {/* App info */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {t("settings.about")}
          </h2>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">
              {t("settings.version")}
            </span>
            <span className="text-gray-900 dark:text-white">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">
              {t("settings.platform")}
            </span>
            <span className="text-gray-900 dark:text-white">Web</span>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3">
            <a
              href="https://volleymanager.volleyball.ch"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 dark:text-orange-400 hover:underline"
            >
              {t("settings.openWebsite")} →
            </a>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3 space-y-2">
            <p className="text-gray-500 dark:text-gray-400">
              {t("settings.dataSource")}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t("settings.disclaimer")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button onClick={logout} className="btn btn-secondary w-full sm:w-auto">
          {t("auth.logout")}
        </button>
      </div>
    </div>
  );
}
