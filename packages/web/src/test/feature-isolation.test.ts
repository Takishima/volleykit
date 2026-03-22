import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

import { describe, it, expect } from 'vitest'

/**
 * Architecture tests to prevent cross-feature barrel imports.
 *
 * Why: Barrel imports (`@/features/X`) re-export page components alongside
 * hooks/utils. When feature A imports feature B's barrel, it pulls in B's
 * page component, defeating lazy-loading code splitting. On iOS Safari PWA,
 * the resulting circular module graph causes "Importing a module script failed".
 *
 * Rule: Cross-feature imports must use direct file paths, not barrels.
 *   ✗ import { useAddToExchange } from '@/features/exchanges'
 *   ✓ import { useAddToExchange } from '@/features/exchanges/hooks/useExchanges'
 */

const FEATURES_DIR = join(__dirname, '..', 'features')

/** Recursively collect all .ts/.tsx source files (excluding tests) */
function getSourceFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isDirectory()) {
      files.push(...getSourceFiles(fullPath))
    } else if (
      /\.(ts|tsx)$/.test(entry) &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.test.tsx') &&
      !entry.endsWith('.spec.ts') &&
      !entry.endsWith('.spec.tsx')
    ) {
      files.push(fullPath)
    }
  }
  return files
}

/** Get all feature directory names */
function getFeatureNames(): string[] {
  return readdirSync(FEATURES_DIR).filter((name) =>
    statSync(join(FEATURES_DIR, name)).isDirectory()
  )
}

/**
 * Pattern matches VALUE barrel imports like:
 *   import { X } from '@/features/exchanges'
 *
 * Does NOT match:
 *   import type { X } from '@/features/exchanges'    (type-only — erased at compile time)
 *   import { X } from '@/features/exchanges/hooks/... (deep import — no barrel)
 */
const VALUE_BARREL_IMPORT_PATTERN = /^import\s+\{[^}]+\}\s+from\s+['"]@\/features\/([^/'"]+)['"]/gm

/** Matches type-only barrel imports (safe — erased at compile time) */
const TYPE_BARREL_IMPORT_PATTERN = /^import\s+type\s+\{[^}]+\}\s+from\s+['"]@\/features\/([^/'"]+)['"]/gm

describe('Feature isolation — no cross-feature barrel imports', () => {
  const featureNames = getFeatureNames()

  for (const feature of featureNames) {
    const featureDir = join(FEATURES_DIR, feature)
    const sourceFiles = getSourceFiles(featureDir)

    for (const filePath of sourceFiles) {
      const relPath = relative(join(FEATURES_DIR, '..'), filePath)

      it(`${relPath} does not barrel-import other features`, () => {
        const content = readFileSync(filePath, 'utf-8')
        const violations: string[] = []

        // Collect type-only barrel imports to exclude them
        const typeImports = new Set<string>()
        for (const match of content.matchAll(TYPE_BARREL_IMPORT_PATTERN)) {
          typeImports.add(match[0])
        }

        for (const match of content.matchAll(VALUE_BARREL_IMPORT_PATTERN)) {
          // Skip type-only imports (they don't affect bundling)
          if (typeImports.has(match[0])) continue
          const importedFeature = match[1]
          // Importing your own barrel is fine
          if (importedFeature === feature) continue
          violations.push(
            `Barrel import from '@/features/${importedFeature}' — use a direct path instead ` +
              `(e.g., '@/features/${importedFeature}/hooks/...' or '@/features/${importedFeature}/utils/...')`
          )
        }

        expect(violations, `Cross-feature barrel imports found in ${relPath}:\n${violations.join('\n')}`).toEqual([])
      })
    }
  }
})
