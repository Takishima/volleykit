import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/api/queryKeys'
import { SETTINGS_STALE_TIME_MS } from '@/common/hooks/usePaginatedQuery'
import { useAuthStore } from '@/common/stores/auth'

import {
  fetchIndoorRefereeProfile,
  fetchPersonProfile,
  type IndoorRefereeProfileResponse,
  type PersonProfileResponse,
} from '../api/indoor-referee-api'

const DEMO_MOBILE_PHONE = '+41 79 000 00 00'
const DEMO_FIRST_NAME = 'Demo'
const DEMO_LAST_NAME = 'User'

/**
 * Fetches the current user's IndoorReferee profile data.
 * Returns Twint-relevant fields: whether to show the Twint action, the mobile phone number,
 * and the user's name (fetched fresh from the person API).
 * In demo mode, returns dummy values and enables the Twint action.
 */
export function useIndoorRefereeProfile() {
  const userId = useAuthStore((state) => state.user?.id)
  const isDemoMode = useAuthStore((state) => state.dataSource) === 'demo'

  const { data } = useQuery<IndoorRefereeProfileResponse>({
    queryKey: queryKeys.user.indoorRefereeProfile(),
    queryFn: () => fetchIndoorRefereeProfile(userId!),
    enabled: !!userId && !isDemoMode,
    staleTime: SETTINGS_STALE_TIME_MS,
  })

  const { data: personData } = useQuery<PersonProfileResponse>({
    queryKey: queryKeys.user.personProfile(),
    queryFn: () => fetchPersonProfile(userId!),
    enabled: !!userId && !isDemoMode,
    staleTime: SETTINGS_STALE_TIME_MS,
  })

  if (isDemoMode) {
    return {
      showTwintAction: true,
      mobilePhone: DEMO_MOBILE_PHONE,
      firstName: DEMO_FIRST_NAME,
      lastName: DEMO_LAST_NAME,
    }
  }

  return {
    showTwintAction: data?.showPhoneNumberForTwintPaymentOnRefereeStatementOfExpenses ?? false,
    mobilePhone: data?.mobilePhoneNumbers ?? null,
    firstName: personData?.person?.firstName ?? '',
    lastName: personData?.person?.lastName ?? '',
  }
}
