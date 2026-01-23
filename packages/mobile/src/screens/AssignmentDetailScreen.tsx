/**
 * Assignment detail screen
 *
 * Displays detailed information about a specific assignment.
 * Fetches data using the shared useAssignmentDetails hook.
 */

import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Linking } from 'react-native'

import { Feather } from '@expo/vector-icons'

import type { Assignment } from '@volleykit/shared/api'
import { useAssignmentDetails } from '@volleykit/shared/hooks'
import { useTranslation, type TranslationKey } from '@volleykit/shared/i18n'

import { COLORS } from '../constants'
import { useApiClient } from '../contexts'
import { formatDateTime } from '../utils'

import type { RootStackScreenProps } from '../navigation/types'

type Props = RootStackScreenProps<'AssignmentDetail'>

// Status badge color mappings
const STATUS_COLORS = {
  active: { bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
  archived: { bg: 'bg-gray-100', text: 'text-gray-700' },
} as const

/**
 * Detail row component for displaying labeled information.
 */
function DetailRow({ label, value, icon }: { label: string; value: string; icon?: string }) {
  return (
    <View className="bg-gray-50 rounded-lg p-4">
      <View className="flex-row items-center mb-1">
        {icon && (
          <Feather
            name={icon as keyof typeof Feather.glyphMap}
            size={14}
            color={COLORS.gray500}
            style={{ marginRight: 6 }}
          />
        )}
        <Text className="text-sm font-medium text-gray-500">{label}</Text>
      </View>
      <Text className="text-gray-900 text-base">{value}</Text>
    </View>
  )
}

/**
 * Extract display data from an assignment.
 */
function getAssignmentDisplayData(assignment: Assignment, language: string, tbd: string) {
  const game = assignment.refereeGame?.game
  const hall = game?.hall
  const address = hall?.primaryPostalAddress
  const location = address?.geographicalLocation

  return {
    homeTeam: game?.teamHome?.name ?? tbd,
    awayTeam: game?.teamAway?.name ?? tbd,
    dateTime: formatDateTime(game?.startingDateTime, language),
    venue: hall?.name ?? tbd,
    address: address?.combinedAddress ?? tbd,
    gameNumber: game?.gameNumber ?? tbd,
    position: assignment.refereePosition,
    status: assignment.refereeConvocationStatus,
    confirmationStatus: assignment.confirmationStatus,
    hasExchange: assignment.isOpenEntryInRefereeGameExchange,
    hasMessage: assignment.hasLastMessageToReferee,
    hasDoubleConvocation: assignment.hasLinkedDoubleConvocation,
    doubleConvocationInfo: assignment.linkedDoubleConvocationGameNumberAndRefereePosition,
    latitude: location?.latitude,
    longitude: location?.longitude,
  }
}

export function AssignmentDetailScreen({ route }: Props) {
  const { t, language } = useTranslation()
  const { id } = route.params
  const apiClient = useApiClient()

  const {
    data: assignment,
    isLoading,
    isError,
    error,
    refetch,
  } = useAssignmentDetails(id, apiClient)

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          accessibilityLabel={t('common.loading')}
        />
      </View>
    )
  }

  // Error state
  if (isError) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Feather name="alert-circle" size={48} color={COLORS.red500} />
        <Text className="text-red-600 text-center mt-4 mb-4">
          {error?.message ?? t('common.error')}
        </Text>
        <TouchableOpacity
          className="bg-sky-500 rounded-lg px-6 py-3"
          onPress={() => refetch()}
          accessibilityRole="button"
          accessibilityLabel={t('common.retry')}
        >
          <Text className="text-white font-medium">{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // No data state
  if (!assignment) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Feather name="file-text" size={48} color={COLORS.gray400} />
        <Text className="text-gray-600 text-center mt-4">{t('assignments.notFound')}</Text>
      </View>
    )
  }

  const display = getAssignmentDisplayData(assignment, language, t('common.tbd'))
  const statusColors = STATUS_COLORS[display.status]

  const handleOpenMaps = () => {
    if (display.latitude && display.longitude) {
      const url = `https://maps.google.com/?q=${display.latitude},${display.longitude}`
      Linking.openURL(url)
    }
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-6">
        {/* Match title */}
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-bold text-gray-900 flex-1 mr-2">
            {display.homeTeam} vs {display.awayTeam}
          </Text>
          <View className={`px-3 py-1.5 rounded-full ${statusColors.bg}`}>
            <Text className={`text-sm font-medium ${statusColors.text}`}>
              {t(`assignments.${display.status}` as TranslationKey)}
            </Text>
          </View>
        </View>

        {/* Game number */}
        <Text className="text-gray-500 mb-6">
          {t('assignments.gameNumber')}: {display.gameNumber}
        </Text>

        {/* Details */}
        <View className="gap-3">
          {/* Date and time */}
          <DetailRow label={t('common.dateTime')} value={display.dateTime} icon="calendar" />

          {/* Position */}
          <DetailRow label={t('common.position')} value={display.position} icon="user" />

          {/* Venue */}
          <View className="bg-gray-50 rounded-lg p-4">
            <View className="flex-row items-center mb-1">
              <Feather name="map-pin" size={14} color={COLORS.gray500} style={{ marginRight: 6 }} />
              <Text className="text-sm font-medium text-gray-500">{t('assignments.venue')}</Text>
            </View>
            <Text className="text-gray-900 text-base">{display.venue}</Text>
            <Text className="text-gray-600 text-sm mt-1">{display.address}</Text>
            {display.latitude && display.longitude && (
              <TouchableOpacity
                className="flex-row items-center mt-3"
                onPress={handleOpenMaps}
                accessibilityRole="button"
                accessibilityLabel={t('common.openInMaps')}
              >
                <Feather name="navigation" size={14} color={COLORS.sky500} />
                <Text className="text-sky-500 ml-2 font-medium">{t('common.openInMaps')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Confirmation status */}
          {display.confirmationStatus && (
            <DetailRow
              label={t('assignments.confirmationStatus')}
              value={display.confirmationStatus}
              icon="check-circle"
            />
          )}

          {/* Exchange indicator */}
          {display.hasExchange && (
            <View className="bg-amber-50 rounded-lg p-4 flex-row items-center">
              <Feather name="repeat" size={18} color={COLORS.amber600} />
              <Text className="text-amber-700 ml-3 flex-1">{t('assignments.exchangeOpen')}</Text>
            </View>
          )}

          {/* Message indicator */}
          {display.hasMessage && (
            <View className="bg-sky-50 rounded-lg p-4 flex-row items-center">
              <Feather name="message-circle" size={18} color={COLORS.sky600} />
              <Text className="text-sky-700 ml-3 flex-1">{t('assignments.hasMessage')}</Text>
            </View>
          )}

          {/* Double convocation indicator */}
          {display.hasDoubleConvocation && display.doubleConvocationInfo && (
            <View className="bg-purple-50 rounded-lg p-4 flex-row items-center">
              <Feather name="users" size={18} color={COLORS.purple600} />
              <View className="ml-3 flex-1">
                <Text className="text-purple-700">{t('assignments.doubleConvocation')}</Text>
                <Text className="text-purple-600 text-sm mt-1">
                  {display.doubleConvocationInfo}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  )
}
