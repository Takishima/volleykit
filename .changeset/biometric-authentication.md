---
"@volleykit/mobile": minor
---

Add biometric authentication for quick re-login

- Secure credential storage using device Keychain/Keystore via expo-secure-store
- Face ID, Touch ID, and fingerprint authentication support via expo-local-authentication
- Biometric settings screen to enable/disable the feature
- Session monitoring with automatic biometric re-auth prompt on session expiry
- Password fallback after 3 failed biometric attempts
- BiometricPrompt component for re-authentication UI
