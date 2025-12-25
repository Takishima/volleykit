import { memo } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getOccupationLabelKey } from "@/utils/occupation-labels";
import type { UserProfile } from "@/stores/auth";

interface ProfileSectionProps {
  user: UserProfile;
}

function ProfileSectionComponent({ user }: ProfileSectionProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
          {t("settings.profile")}
        </h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-2xl">
            {user.firstName.charAt(0)}
            {user.lastName.charAt(0)}
          </div>
          <div>
            <div className="font-medium text-text-primary dark:text-text-primary-dark">
              {user.firstName} {user.lastName}
            </div>
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
