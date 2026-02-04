/**
 * VolleyKit Mobile App Entry Point
 */

import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AppProviders } from './src/providers/AppProviders'
import { RootNavigator } from './src/navigation/RootNavigator'
import { ToastContainer } from './src/components/Toast'

import './global.css'

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <RootNavigator />
        <ToastContainer />
        <StatusBar style="auto" />
      </AppProviders>
    </SafeAreaProvider>
  )
}
