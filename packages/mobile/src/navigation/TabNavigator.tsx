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

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray500,
        headerShown: true,
        headerRight: () => <HeaderRight />,
      }}
    >
      <Tab.Screen
        name="Assignments"
        component={AssignmentsScreen}
        options={{
          title: 'Assignments',
          tabBarIcon: ({ color }) => <Feather name="calendar" size={TAB_ICON_SIZE} color={color} />,
        }}
      />
      <Tab.Screen
        name="Compensations"
        component={CompensationsScreen}
        options={{
          title: 'Compensations',
          tabBarIcon: ({ color }) => (
            <Feather name="dollar-sign" size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Exchanges"
        component={ExchangesScreen}
        options={{
          title: 'Exchanges',
          tabBarIcon: ({ color }) => <Feather name="repeat" size={TAB_ICON_SIZE} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Feather name="settings" size={TAB_ICON_SIZE} color={color} />,
        }}
      />
    </Tab.Navigator>
  )
}
