import { useQuery } from '@tanstack/react-query'

import { getApiBaseUrl } from '@/api/constants'
import { queryKeys } from '@/api/queryKeys'
import { SETTINGS_STALE_TIME_MS } from '@/common/hooks/usePaginatedQuery'
import { useAuthStore } from '@/common/stores/auth'

const DEMO_MOBILE_PHONE = '+41 79 000 00 00'

interface IndoorRefereeProfileResponse {
  mobilePhoneNumbers?: string
  showPhoneNumberForTwintPaymentOnRefereeStatementOfExpenses?: boolean
}

/**
 * Fetches the current user's IndoorReferee profile data.
 * Returns Twint-relevant fields: whether to show the Twint action and the mobile phone number.
 * In demo mode, returns a dummy phone number and enables the Twint action.
 */
export function useIndoorRefereeProfile() {
  const userId = useAuthStore((state) => state.user?.id)
  const isDemoMode = useAuthStore((state) => state.dataSource) === 'demo'

  const { data } = useQuery<IndoorRefereeProfileResponse>({
    queryKey: queryKeys.user.profile(),
    queryFn: async () => {
      const params = new URLSearchParams({ person: userId! })
      const response = await fetch(
        `${getApiBaseUrl()}/indoorvolleyball.refadmin/api%5Cindoorreferee/getIndoorRefereeByActivePerson?${params}`,
        { credentials: 'include', headers: { Accept: 'application/json' } }
      )
      if (!response.ok) return {}
      return response.json() as Promise<IndoorRefereeProfileResponse>
    },
    enabled: !!userId && !isDemoMode,
    staleTime: SETTINGS_STALE_TIME_MS,
  })

  if (isDemoMode) {
    return {
      showTwintAction: true,
      mobilePhone: DEMO_MOBILE_PHONE,
    }
  }

  return {
    showTwintAction: data?.showPhoneNumberForTwintPaymentOnRefereeStatementOfExpenses ?? false,
    mobilePhone: data?.mobilePhoneNumbers ?? null,
  }
}
