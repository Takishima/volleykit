/**
 * Bottom tab navigator for main app screens
 */

import { View } from 'react-native'

import { Feather } from '@expo/vector-icons'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import { OfflineIndicator } from '../components/OfflineBanner'
import { PendingActionsIndicator } from '../components/PendingActionsIndicator'
import { COLORS, TAB_ICON_SIZE } from '../constants'
import { AssignmentsScreen } from '../screens/AssignmentsScreen'
import { CompensationsScreen } from '../screens/CompensationsScreen'
import { ExchangesScreen } from '../screens/ExchangesScreen'
import { SettingsScreen } from '../screens/SettingsScreen'

import type { MainTabParamList } from './types'

const Tab = createBottomTabNavigator<MainTabParamList>()

interface TabIconProps {
  name: keyof typeof Feather.glyphMap
  color: string
}

function TabIcon({ name, color }: TabIconProps) {
  return <Feather name={name} size={TAB_ICON_SIZE} color={color} />
}

function AssignmentsTabIcon({ color }: { color: string }) {
  return <TabIcon name="calendar" color={color} />
}

function CompensationsTabIcon({ color }: { color: string }) {
  return <TabIcon name="dollar-sign" color={color} />
}

function ExchangesTabIcon({ color }: { color: string }) {
  return <TabIcon name="repeat" color={color} />
}

function SettingsTabIcon({ color }: { color: string }) {
  return <TabIcon name="settings" color={color} />
}

/**
 * Header right component showing offline status and pending actions.
 */
function HeaderRight() {
  return (
    <View className="flex-row items-center gap-2 mr-4">
      <PendingActionsIndicator />
      <OfflineIndicator />
    </View>
  )
}

function renderHeaderRight() {
  return <HeaderRight />
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray500,
        headerShown: true,
        headerRight: renderHeaderRight,
      }}
    >
      <Tab.Screen
        name="Assignments"
        component={AssignmentsScreen}
        options={{
          title: 'Assignments',
          tabBarIcon: AssignmentsTabIcon,
        }}
      />
      <Tab.Screen
        name="Compensations"
        component={CompensationsScreen}
        options={{
          title: 'Compensations',
          tabBarIcon: CompensationsTabIcon,
        }}
      />
      <Tab.Screen
        name="Exchanges"
        component={ExchangesScreen}
        options={{
          title: 'Exchanges',
          tabBarIcon: ExchangesTabIcon,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: SettingsTabIcon,
        }}
      />
    </Tab.Navigator>
  )
}
