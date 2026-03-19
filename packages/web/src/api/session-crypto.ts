/**
 * Session token encryption using Web Crypto API.
 *
 * Security model:
 * - Encryption key is stored in IndexedDB as a non-extractable CryptoKey
 * - Key cannot be read by JavaScript, only used for encrypt/decrypt operations
 * - Encrypted token is stored in localStorage
 * - AES-GCM provides both encryption and authentication
 *
 * This provides better protection than plaintext localStorage, though it's
 * not equivalent to Secure Enclave (which requires native app access).
 */

const DB_NAME = 'volleykit-security'
const DB_VERSION = 1
const STORE_NAME = 'keys'
const KEY_ID = 'session-encryption-key'
/** AES-GCM uses 12-byte (96-bit) IV for optimal security */
const AES_GCM_IV_LENGTH = 12

/**
 * Open the IndexedDB database for key storage.
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

/**
 * Get or create the encryption key.
 * Key is non-extractable, meaning it cannot be read by JavaScript.
 */
async function getOrCreateKey(): Promise<CryptoKey> {
  const db = await openDatabase()

  // Try to get existing key
  const existingKey = await new Promise<CryptoKey | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(KEY_ID)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const result = request.result as { id: string; key: CryptoKey } | undefined
      resolve(result?.key ?? null)
    }
  })

  if (existingKey) {
    db.close()
    return existingKey
  }

  // Generate new key (non-extractable)
  const newKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable - cannot be read, only used
    ['encrypt', 'decrypt']
  )

  // Store the key
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put({ id: KEY_ID, key: newKey })

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })

  db.close()
  return newKey
}

/**
 * Encrypt a string using the stored key.
 * Returns base64-encoded ciphertext with IV prepended.
 */
export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getOrCreateKey()

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH))

  // Encode plaintext to bytes
  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)

  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt a string using the stored key.
 * Expects base64-encoded ciphertext with IV prepended.
 */
export async function decryptToken(encrypted: string): Promise<string | null> {
  try {
    const key = await getOrCreateKey()

    // Decode from base64
    const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0))

    // Extract IV and ciphertext
    const iv = combined.slice(0, AES_GCM_IV_LENGTH)
    const ciphertext = combined.slice(AES_GCM_IV_LENGTH)

    // Decrypt
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)

    // Decode bytes to string
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch {
    // Decryption failed (wrong key, tampered data, etc.)
    return null
  }
}

/**
 * Check if Web Crypto and IndexedDB are available.
 */
export function isSecureStorageAvailable(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof indexedDB !== 'undefined'
  )
}

/**
 * Clear the encryption key (e.g., on logout).
 * This invalidates all encrypted data.
 */
export async function clearEncryptionKey(): Promise<void> {
  try {
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(KEY_ID)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
    db.close()
  } catch {
    // Ignore errors during cleanup
  }
}
