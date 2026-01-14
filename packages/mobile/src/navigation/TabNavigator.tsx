/**
 * Bottom tab navigator for main app screens
 */

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Calendar, DollarSign, Repeat, Settings } from 'lucide-react-native';

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
          tabBarIcon: ({ color }) => <Calendar size={ICON_SIZE} color={color} />,
        }}
      />
      <Tab.Screen
        name="Compensations"
        component={CompensationsScreen}
        options={{
          title: 'Compensations',
          tabBarIcon: ({ color }) => <DollarSign size={ICON_SIZE} color={color} />,
        }}
      />
      <Tab.Screen
        name="Exchanges"
        component={ExchangesScreen}
        options={{
          title: 'Exchanges',
          tabBarIcon: ({ color }) => <Repeat size={ICON_SIZE} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={ICON_SIZE} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
