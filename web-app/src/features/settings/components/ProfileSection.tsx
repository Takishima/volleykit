import { memo, useState, useEffect } from 'react'

import { Badge } from '@/shared/components/Badge'
import { Card, CardContent, CardHeader } from '@/shared/components/Card'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useAuthStore } from '@/shared/stores/auth'
import type { UserProfile } from '@/shared/stores/auth'
import { getOccupationLabelKey } from '@/shared/utils/occupation-labels'

const API_BASE = import.meta.env.VITE_API_PROXY_URL || ''

interface ProfileSectionProps {
  user: UserProfile
}

interface PersonProfile {
  profilePicture?: {
    publicResourceUri?: string
  }
  svNumber?: number
  associationId?: number
  firstName?: string
  lastName?: string
}

interface PersonProfileResponse {
  person?: PersonProfile
}

const DEMO_SV_NUMBER = 12345
const DEMO_FIRST_NAME = 'Demo'
const DEMO_LAST_NAME = 'User'

function ProfileSectionComponent({ user }: ProfileSectionProps) {
  const { t } = useTranslation()
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    user.profilePictureUrl ?? null
  )
  const [svNumber, setSvNumber] = useState<number | null>(isDemoMode ? DEMO_SV_NUMBER : null)
  const [firstName, setFirstName] = useState<string>(isDemoMode ? DEMO_FIRST_NAME : user.firstName)
  const [lastName, setLastName] = useState<string>(isDemoMode ? DEMO_LAST_NAME : user.lastName)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    // Skip fetching if in demo mode or no user id
    if (isDemoMode || !user.id) {
      return
    }

    const controller = new AbortController()

    async function fetchProfileData() {
      try {
        const params = new URLSearchParams()
        params.set('person[__identity]', user.id)
        // Request basic properties first, then nested properties.
        // Parent objects (hasProfilePicture, profilePicture) must be requested before
        // nested properties (profilePicture.publicResourceUri) to avoid 500 errors.
        params.set('propertyRenderConfiguration[0]', 'firstName')
        params.set('propertyRenderConfiguration[1]', 'lastName')
        params.set('propertyRenderConfiguration[2]', 'svNumber')
        params.set('propertyRenderConfiguration[3]', 'associationId')
        params.set('propertyRenderConfiguration[4]', 'hasProfilePicture')
        params.set('propertyRenderConfiguration[5]', 'profilePicture')
        params.set('propertyRenderConfiguration[6]', 'profilePicture.publicResourceUri')

        const response = await fetch(
          `${API_BASE}/sportmanager.volleyball/api%5Cperson/showWithNestedObjects?${params}`,
          {
            credentials: 'include',
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          }
        )

        if (response.ok) {
          const data: PersonProfileResponse = await response.json()
          const person = data.person
          if (person?.profilePicture?.publicResourceUri) {
            setProfilePictureUrl(person.profilePicture.publicResourceUri)
          }
          // Check for svNumber first, fall back to associationId (same value, different property names)
          const svNum = person?.svNumber ?? person?.associationId
          if (svNum != null) {
            setSvNumber(svNum)
          }
          if (person?.firstName) {
            setFirstName(person.firstName)
          }
          if (person?.lastName) {
            setLastName(person.lastName)
          }
        }
      } catch (error) {
        // Ignore abort errors (expected during cleanup) and other errors (profile data is optional)
        if (error instanceof Error && error.name !== 'AbortError') {
          // Profile data fetch failed - this is non-critical, so we don't surface the error
        }
      }
    }

    fetchProfileData()

    return () => controller.abort()
  }, [user.id, isDemoMode])

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
          {t('settings.profile')}
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
              {firstName.charAt(0) || lastName.charAt(0) || '?'}
              {lastName.charAt(0) || firstName.charAt(0) || ''}
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
                {t('settings.svNumber')}: {svNumber}
              </div>
            )}
            {user.email && (
              <div className="text-sm text-text-muted dark:text-text-muted-dark">{user.email}</div>
            )}
          </div>
        </div>

        {user.occupations && user.occupations.length > 0 && (
          <div className="border-t border-border-subtle dark:border-border-subtle-dark pt-4">
            <div className="text-sm text-text-muted dark:text-text-muted-dark mb-2">
              {t('settings.roles')}
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
  )
}

export const ProfileSection = memo(ProfileSectionComponent)
