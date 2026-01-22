/**
 * Navigation type definitions
 */

import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Root stack navigator param list
export type RootStackParamList = {
  Login: undefined;
  Loading: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  AssignmentDetail: { id: string };
  BiometricSettings: undefined;
  CalendarSettings: undefined;
  DepartureReminderSettings: undefined;
};

// Main tab navigator param list
export type MainTabParamList = {
  Assignments: undefined;
  Compensations: undefined;
  Exchanges: undefined;
  Settings: undefined;
};

// Screen props types
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

// Declare global types for useNavigation hook
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
