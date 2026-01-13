/**
 * Login screen with SwissVolley credential form
 */

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';

import type { RootStackScreenProps } from '../navigation/types';

type Props = RootStackScreenProps<'Login'>;

export function LoginScreen(_props: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement login logic in Phase 3 (T047)
      console.log('Login attempted with:', username);
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900">VolleyKit</Text>
        <Text className="text-lg text-gray-600 mt-2">Sign in with your SwissVolley account</Text>
      </View>

      {error && (
        <View className="bg-red-50 p-4 rounded-lg mb-4">
          <Text className="text-red-700">{error}</Text>
        </View>
      )}

      <View className="gap-4">
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Username</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 text-base"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Enter your username"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Password</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 text-base"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter your password"
          />
        </View>

        <TouchableOpacity
          className="bg-primary-600 rounded-lg py-4 mt-4"
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-semibold text-base">Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
