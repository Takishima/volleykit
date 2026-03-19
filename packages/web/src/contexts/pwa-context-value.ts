import { createContext } from 'react'

export interface PWAContextType {
  offlineReady: boolean
  needRefresh: boolean
  isChecking: boolean
  lastChecked: Date | null
  checkError: Error | null
  registrationError: Error | null
  checkForUpdate: () => Promise<void>
  updateApp: () => Promise<void>
  dismissPrompt: () => void
}

export const PWAContext = createContext<PWAContextType | null>(null)
