/**
 * Root navigator with auth flow handling
 */

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '@volleykit/shared/hooks';

import { LoginScreen } from '../screens/LoginScreen';
import { LoadingScreen } from '../screens/LoadingScreen';
import { AssignmentDetailScreen } from '../screens/AssignmentDetailScreen';
import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Deep linking configuration
const linking = {
  prefixes: ['volleykit://'],
  config: {
    screens: {
      Main: {
        screens: {
          Assignments: 'assignments',
          Compensations: 'compensations',
          Exchanges: 'exchanges',
          Settings: 'settings',
        },
      },
      AssignmentDetail: 'assignment/:id',
    },
  },
};

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoading ? (
          <Stack.Screen name="Loading" component={LoadingScreen} />
        ) : isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="AssignmentDetail"
              component={AssignmentDetailScreen}
              options={{ headerShown: true, title: 'Assignment' }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
