import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "@/stores/auth";
import { useDemoStore } from "@/stores/demo";
import { useSettingsStore } from "@/stores/settings";
import { useTranslation } from "@/hooks/useTranslation";
import { useTour } from "@/hooks/useTour";
import { Button } from "@/components/ui/Button";
import {
  ProfileSection,
  LanguageSection,
  HomeLocationSection,
  TransportSection,
  DataRetentionSection,
  TourSection,
  DemoSection,
  SafeModeSection,
  PrivacySection,
  UpdateSection,
  AboutSection,
} from "@/components/features/settings";

export function SettingsPage() {
  const { user, logout, isDemoMode } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      logout: state.logout,
      isDemoMode: state.isDemoMode,
    })),
  );
  const { activeAssociationCode, refreshData } = useDemoStore(
    useShallow((state) => ({
      activeAssociationCode: state.activeAssociationCode,
      refreshData: state.refreshData,
    })),
  );
  const { isSafeModeEnabled, setSafeMode } = useSettingsStore(
    useShallow((state) => ({
      isSafeModeEnabled: state.isSafeModeEnabled,
      setSafeMode: state.setSafeMode,
    })),
  );
  const { t } = useTranslation();

  // Initialize tour for this page (triggers auto-start on first visit)
  useTour("settings");

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">
        {t("settings.title")}
      </h1>

      {user && <ProfileSection user={user} />}

      <LanguageSection />

      <HomeLocationSection />

      <TransportSection />

      <DataRetentionSection />

      <TourSection isDemoMode={isDemoMode} />

      {isDemoMode && (
        <DemoSection
          activeAssociationCode={activeAssociationCode}
          onRefreshData={refreshData}
        />
      )}

      {!isDemoMode && (
        <SafeModeSection
          isSafeModeEnabled={isSafeModeEnabled}
          onSetSafeMode={setSafeMode}
        />
      )}

      <PrivacySection />

      {__PWA_ENABLED__ && <UpdateSection />}

      <AboutSection />

      {/* Logout */}
      <div className="pt-4 border-t border-border-default dark:border-border-default-dark">
        <Button
          variant="secondary"
          onClick={logout}
          className="w-full sm:w-auto"
        >
          {t("auth.logout")}
        </Button>
      </div>
    </div>
  );
}
