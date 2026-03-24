const CH_COUNTRY_CODE = '+41'

/**
 * Formats a phone number for display.
 * Assumes Switzerland (+41) if no country code is present.
 *
 * Swiss mobile format: +41 7X XXX XX XX
 * Swiss landline format: +41 XX XXX XX XX
 *
 * @example
 * formatPhoneNumber('0791234567')  → '+41 79 123 45 67'
 * formatPhoneNumber('+41791234567') → '+41 79 123 45 67'
 * formatPhoneNumber('+41 79 123 45 67') → '+41 79 123 45 67' (already formatted)
 * formatPhoneNumber('+33 6 12 34 56 78') → '+33612345678' (non-CH, stripped)
 */
export function formatPhoneNumber(raw: string): string {
  const digits = raw.replace(/[\s\-().]/g, '')

  let e164: string
  if (digits.startsWith('+')) {
    e164 = digits
  } else if (digits.startsWith('00')) {
    e164 = `+${digits.slice(2)}`
  } else if (digits.startsWith('0')) {
    // Local Swiss number: 0XX XXX XX XX → +41 XX XXX XX XX
    e164 = `${CH_COUNTRY_CODE}${digits.slice(1)}`
  } else {
    return raw
  }

  // Format Swiss numbers: +41 followed by 9 digits
  const swissMatch = e164.match(/^\+41(\d{2})(\d{3})(\d{2})(\d{2})$/)
  if (swissMatch) {
    return `+41 ${swissMatch[1]} ${swissMatch[2]} ${swissMatch[3]} ${swissMatch[4]}`
  }

  return e164
}
