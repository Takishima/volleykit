import { apiRequest } from '@/api/transport'

export interface IndoorRefereeProfileResponse {
  mobilePhoneNumbers?: string
  showPhoneNumberForTwintPaymentOnRefereeStatementOfExpenses?: boolean
}

export interface PersonProfileResponse {
  person?: {
    firstName?: string
    lastName?: string
  }
}

const INDOOR_REFEREE_ENDPOINT =
  '/indoorvolleyball.refadmin/api%5Cindoorreferee/getIndoorRefereeByActivePerson'
const PERSON_ENDPOINT = '/sportmanager.volleyball/api%5Cperson/showWithNestedObjects'

export function fetchIndoorRefereeProfile(userId: string): Promise<IndoorRefereeProfileResponse> {
  return apiRequest<IndoorRefereeProfileResponse>(INDOOR_REFEREE_ENDPOINT, 'GET', {
    person: userId,
  })
}

export function fetchPersonProfile(userId: string): Promise<PersonProfileResponse> {
  return apiRequest<PersonProfileResponse>(PERSON_ENDPOINT, 'GET', {
    'person[__identity]': userId,
    'propertyRenderConfiguration[0]': 'firstName',
    'propertyRenderConfiguration[1]': 'lastName',
  })
}
