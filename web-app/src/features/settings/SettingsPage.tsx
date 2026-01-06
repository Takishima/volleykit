import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "@/shared/stores/auth";
import { useDemoStore } from "@/shared/stores/demo";
import { useSettingsStore } from "@/shared/stores/settings";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useTour } from "@/shared/hooks/useTour";
import { Button } from "@/shared/components/Button";
import {
  ProfileSection,
  LanguageSection,
  HomeLocationSection,
  TransportSection,
  DataRetentionSection,
  TourSection,
  HelpSection,
  DemoSection,
  AccessibilitySection,
  SafeModeSection,
  SafeValidationSection,
  UpdateSection,
  ExperimentalSection,
  AboutSection,
} from "./components";

export function SettingsPage() {
  const { user, logout, dataSource } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      logout: state.logout,
      dataSource: state.dataSource,
    })),
  );
  const isDemoMode = dataSource === "demo";
  const { activeAssociationCode, refreshData } = useDemoStore(
    useShallow((state) => ({
      activeAssociationCode: state.activeAssociationCode,
      refreshData: state.refreshData,
    })),
  );
  const {
    isSafeModeEnabled,
    setSafeMode,
    isSafeValidationEnabled,
    setSafeValidation,
    preventZoom,
    setPreventZoom,
  } = useSettingsStore(
    useShallow((state) => ({
      isSafeModeEnabled: state.isSafeModeEnabled,
      setSafeMode: state.setSafeMode,
      isSafeValidationEnabled: state.isSafeValidationEnabled,
      setSafeValidation: state.setSafeValidation,
      preventZoom: state.preventZoom,
      setPreventZoom: state.setPreventZoom,
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

      <HelpSection />

      <AccessibilitySection
        preventZoom={preventZoom}
        onSetPreventZoom={setPreventZoom}
      />

      {isDemoMode && (
        <DemoSection
          activeAssociationCode={activeAssociationCode}
          onRefreshData={refreshData}
        />
      )}

      {!isDemoMode && (
        <>
          <SafeModeSection
            isSafeModeEnabled={isSafeModeEnabled}
            onSetSafeMode={setSafeMode}
          />
          <SafeValidationSection
            isSafeValidationEnabled={isSafeValidationEnabled}
            onSetSafeValidation={setSafeValidation}
          />
        </>
      )}

      {__PWA_ENABLED__ && <UpdateSection />}

      <ExperimentalSection />

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
