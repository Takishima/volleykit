/**
 * i18n Drift Detection Test
 *
 * Compares overlapping translation keys between web and shared packages
 * to detect drift where the same key has different translations.
 *
 * This test does NOT enforce full consolidation — web and shared intentionally
 * have different keys and some intentionally differ (platform-specific wording).
 * It tracks the current drift count and fails if new drift is introduced.
 */

import { describe, it, expect } from 'vitest'

import {
  de as sharedDe,
  en as sharedEn,
  fr as sharedFr,
  it as sharedIt,
} from '@volleykit/shared/i18n'

import webDe from '@/i18n/locales/de'
import webEn from '@/i18n/locales/en'
import webFr from '@/i18n/locales/fr'
import webIt from '@/i18n/locales/it'

/**
 * Baseline drift counts per locale. These represent the current state of
 * intentional/accepted differences between web and shared translations.
 *
 * If you intentionally change a translation to differ from shared, increase
 * the relevant count. If you fix drift (make web match shared), decrease it.
 *
 * Run `pnpm exec vitest run src/i18n/drift-detection.test.ts` to see
 * which specific keys are drifted when updating these counts.
 */
const DRIFT_BASELINE: Record<string, number> = {
  en: 12,
  de: 14,
  fr: 38,
  it: 37,
}

/**
 * Recursively flatten a nested object into dot-notation keys.
 */
function flattenKeys(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value as Record<string, unknown>, fullKey))
    } else if (typeof value === 'string') {
      result[fullKey] = value
    }
  }

  return result
}

function findDriftedKeys(
  webFlat: Record<string, string>,
  sharedFlat: Record<string, string>
): Array<{ key: string; web: string; shared: string }> {
  const drifted: Array<{ key: string; web: string; shared: string }> = []

  for (const [key, webValue] of Object.entries(webFlat)) {
    if (key in sharedFlat && sharedFlat[key] !== webValue) {
      drifted.push({ key, web: webValue, shared: sharedFlat[key]! })
    }
  }

  return drifted
}

describe('i18n drift detection', () => {
  const locales = [
    { name: 'en', web: webEn, shared: sharedEn },
    { name: 'de', web: webDe, shared: sharedDe },
    { name: 'fr', web: webFr, shared: sharedFr },
    { name: 'it', web: webIt, shared: sharedIt },
  ] as const

  for (const { name, web, shared } of locales) {
    it(`${name}: no new translation drift introduced (baseline: ${DRIFT_BASELINE[name]})`, () => {
      const webFlat = flattenKeys(web as unknown as Record<string, unknown>)
      const sharedFlat = flattenKeys(shared as unknown as Record<string, unknown>)
      const drifted = findDriftedKeys(webFlat, sharedFlat)

      const baseline = DRIFT_BASELINE[name] ?? 0

      if (drifted.length > baseline) {
        const report = drifted
          .map((d) => `  ${d.key}:\n    web:    "${d.web}"\n    shared: "${d.shared}"`)
          .join('\n')

        expect.fail(
          `Drift increased in ${name}: ${drifted.length} drifted keys (baseline: ${baseline}).\n` +
            `New drift detected:\n${report}\n\n` +
            'Either fix the drift or update DRIFT_BASELINE if the difference is intentional.'
        )
      }

      // Also fail if drift decreased significantly — update baseline to track improvement
      if (drifted.length < baseline - 2) {
        expect.fail(
          `Drift decreased in ${name}: ${drifted.length} drifted keys (baseline: ${baseline}).\n` +
            `Update DRIFT_BASELINE["${name}"] to ${drifted.length} to lock in the improvement.`
        )
      }
    })
  }

  it('reports overlapping key statistics', () => {
    const webFlat = flattenKeys(webEn as unknown as Record<string, unknown>)
    const sharedFlat = flattenKeys(sharedEn as unknown as Record<string, unknown>)

    const overlapping = Object.keys(webFlat).filter((key) => key in sharedFlat)
    const drifted = findDriftedKeys(webFlat, sharedFlat)

    console.log(`i18n overlap: ${overlapping.length} keys shared between web and shared`)
    console.log(`  identical: ${overlapping.length - drifted.length} keys`)
    console.log(`  drifted: ${drifted.length} keys (baseline: ${DRIFT_BASELINE['en']})`)
    console.log(`  web-only: ${Object.keys(webFlat).length - overlapping.length} keys`)
    console.log(`  shared-only: ${Object.keys(sharedFlat).length - overlapping.length} keys`)

    // Sanity check: we should have SOME overlap (common, auth, nav sections)
    expect(overlapping.length).toBeGreaterThan(50)
  })
})

/**
 * i18n Completeness Test
 *
 * Ensures that de, fr, and it locale files contain every key present in English.
 * Missing keys fall back to English silently, making bugs hard to spot.
 * This test catches regressions when new keys are added only to en.ts.
 */
describe('i18n completeness', () => {
  const enFlat = flattenKeys(webEn as unknown as Record<string, unknown>)

  const nonEnglishLocales = [
    { name: 'de', locale: webDe },
    { name: 'fr', locale: webFr },
    { name: 'it', locale: webIt },
  ] as const

  for (const { name, locale } of nonEnglishLocales) {
    it(`${name}: contains all keys present in English`, () => {
      const flat = flattenKeys(locale as unknown as Record<string, unknown>)
      const missingKeys = Object.keys(enFlat).filter((key) => !(key in flat))

      if (missingKeys.length > 0) {
        expect.fail(
          `${name}.ts is missing ${missingKeys.length} key(s) present in en.ts:\n` +
            missingKeys.map((k) => `  ${k}`).join('\n') +
            '\n\nAdd the missing translations to avoid silent English fallback.'
        )
      }

      expect(missingKeys).toHaveLength(0)
    })
  }
})
