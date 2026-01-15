/**
 * Bottom tab navigator for main app screens
 */

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

import { AssignmentsScreen } from '../screens/AssignmentsScreen';
import { CompensationsScreen } from '../screens/CompensationsScreen';
import { ExchangesScreen } from '../screens/ExchangesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICON_SIZE = 24;

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#64748b',
        headerShown: true,
      }}
    >
      <Tab.Screen
        name="Assignments"
        component={AssignmentsScreen}
        options={{
          title: 'Assignments',
          tabBarIcon: ({ color }) => <Feather name="calendar" size={ICON_SIZE} color={color} />,
        }}
      />
      <Tab.Screen
        name="Compensations"
        component={CompensationsScreen}
        options={{
          title: 'Compensations',
          tabBarIcon: ({ color }) => <Feather name="dollar-sign" size={ICON_SIZE} color={color} />,
        }}
      />
      <Tab.Screen
        name="Exchanges"
        component={ExchangesScreen}
        options={{
          title: 'Exchanges',
          tabBarIcon: ({ color }) => <Feather name="repeat" size={ICON_SIZE} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Feather name="settings" size={ICON_SIZE} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
