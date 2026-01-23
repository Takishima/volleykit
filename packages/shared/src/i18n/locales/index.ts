/**
 * Locale exports for VolleyKit mobile app.
 */

import de from './de'
import en from './en'
import fr from './fr'
import it from './it'

import type { Language, Translations } from '../types'

export { de, en, fr, it }

export const locales: Record<Language, Translations> = {
  de,
  en,
  fr,
  it,
}

export default locales
