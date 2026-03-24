import { apiRequest } from '@/api/transport'

export interface IndoorRefereeProfileResponse {
  mobilePhoneNumbers?: string
  showPhoneNumberForTwintPaymentOnRefereeStatementOfExpenses?: boolean
}

const INDOOR_REFEREE_ENDPOINT =
  '/indoorvolleyball.refadmin/api%5Cindoorreferee/getIndoorRefereeByActivePerson'

export function fetchIndoorRefereeProfile(userId: string): Promise<IndoorRefereeProfileResponse> {
  return apiRequest<IndoorRefereeProfileResponse>(INDOOR_REFEREE_ENDPOINT, 'GET', {
    person: userId,
  })
}
