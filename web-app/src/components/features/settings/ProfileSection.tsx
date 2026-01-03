import { memo, useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getOccupationLabelKey } from "@/utils/occupation-labels";
import { useAuthStore } from "@/stores/auth";
import type { UserProfile } from "@/stores/auth";

const API_BASE = import.meta.env.VITE_API_PROXY_URL || "";

interface ProfileSectionProps {
  user: UserProfile;
}

interface PersonProfileResponse {
  profilePicture?: {
    publicResourceUri?: string;
  };
  svNumber?: number;
  firstName?: string;
  lastName?: string;
}

const DEMO_SV_NUMBER = 12345;
const DEMO_FIRST_NAME = "Demo";
const DEMO_LAST_NAME = "User";

function ProfileSectionComponent({ user }: ProfileSectionProps) {
  const { t } = useTranslation();
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    user.profilePictureUrl ?? null,
  );
  const [svNumber, setSvNumber] = useState<number | null>(
    isDemoMode ? DEMO_SV_NUMBER : null,
  );
  const [firstName, setFirstName] = useState<string>(
    isDemoMode ? DEMO_FIRST_NAME : user.firstName,
  );
  const [lastName, setLastName] = useState<string>(
    isDemoMode ? DEMO_LAST_NAME : user.lastName,
  );
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Skip fetching if in demo mode or no user id
    if (isDemoMode || !user.id) {
      return;
    }

    const controller = new AbortController();

    async function fetchProfileData() {
      try {
        const params = new URLSearchParams();
        params.set("person[__identity]", user.id);
        params.set("propertyRenderConfiguration[0]", "profilePicture.publicResourceUri");
        params.set("propertyRenderConfiguration[1]", "svNumber");
        params.set("propertyRenderConfiguration[2]", "firstName");
        params.set("propertyRenderConfiguration[3]", "lastName");

        const response = await fetch(
          `${API_BASE}/sportmanager.volleyball/api%5Cperson/showWithNestedObjects?${params}`,
          {
            credentials: "include",
            signal: controller.signal,
            headers: { Accept: "application/json" },
          },
        );

        if (response.ok) {
          const data: PersonProfileResponse = await response.json();
          if (data.profilePicture?.publicResourceUri) {
            setProfilePictureUrl(data.profilePicture.publicResourceUri);
          }
          if (data.svNumber) {
            setSvNumber(data.svNumber);
          }
          if (data.firstName) {
            setFirstName(data.firstName);
          }
          if (data.lastName) {
            setLastName(data.lastName);
          }
        }
      } catch (error) {
        // Ignore abort errors (expected during cleanup) and other errors (profile data is optional)
        if (error instanceof Error && error.name !== "AbortError") {
          // Profile data fetch failed - this is non-critical, so we don't surface the error
        }
      }
    }

    fetchProfileData();

    return () => controller.abort();
  }, [user.id, isDemoMode]);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
          {t("settings.profile")}
        </h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          {profilePictureUrl && !imageError ? (
            <img
              src={profilePictureUrl}
              alt={`${firstName} ${lastName}`}
              className="w-16 h-16 rounded-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-2xl"
              aria-label={`${firstName} ${lastName}`}
            >
              {firstName.charAt(0) || lastName.charAt(0) || "?"}
              {lastName.charAt(0) || firstName.charAt(0) || ""}
            </div>
          )}
          <div>
            {(firstName || lastName) && (
              <div className="font-medium text-text-primary dark:text-text-primary-dark">
                {firstName} {lastName}
              </div>
            )}
            {svNumber && (
              <div className="text-sm text-text-muted dark:text-text-muted-dark">
                {t("settings.svNumber")}: {svNumber}
              </div>
            )}
            {user.email && (
              <div className="text-sm text-text-muted dark:text-text-muted-dark">
                {user.email}
              </div>
            )}
          </div>
        </div>

        {user.occupations && user.occupations.length > 0 && (
          <div className="border-t border-border-subtle dark:border-border-subtle-dark pt-4">
            <div className="text-sm text-text-muted dark:text-text-muted-dark mb-2">
              {t("settings.roles")}
            </div>
            <div className="flex flex-wrap gap-2">
              {user.occupations.map((occ) => (
                <Badge key={occ.id} variant="neutral" className="rounded-full">
                  {t(getOccupationLabelKey(occ.type))}
                  {occ.associationCode && ` (${occ.associationCode})`}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const ProfileSection = memo(ProfileSectionComponent);
