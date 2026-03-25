#!/usr/bin/env node

/**
 * sync-style-tokens.js
 *
 * Reads design-tokens.css (the single source of truth) and generates
 * colors.js for React Native / NativeWind (Tailwind 3), which cannot
 * consume CSS custom properties.
 *
 * Usage:  node scripts/sync-style-tokens.js [--check]
 *   --check   Exit with code 1 if colors.js is out of date (for CI)
 */

const { readFileSync, writeFileSync } = require('node:fs')
const { resolve } = require('node:path')

const ROOT = resolve(__dirname, '..')

const CSS_PATH = resolve(ROOT, 'packages/shared/styles/design-tokens.css')
const JS_PATH = resolve(ROOT, 'packages/shared/styles/colors.js')

// Color groups to extract (token prefix -> JS export name)
const COLOR_GROUPS = ['primary', 'success', 'warning', 'danger', 'gray']

function parseDesignTokens(css) {
  const colors = {}

  for (const group of COLOR_GROUPS) {
    colors[group] = {}
    // Match lines like: --color-primary-500: #b2e600;
    // Limitation: only hex colors are supported. If design-tokens.css starts
    // using rgb(), hsl(), or CSS color names, this regex will skip them.
    // Extend the regex and value transform here if that happens.
    const re = new RegExp(`--color-${group}-(\\d+):\\s*(#[0-9a-fA-F]{3,8})`, 'g')
    let match
    while ((match = re.exec(css)) !== null) {
      colors[group][match[1]] = match[2]
    }
  }

  // Warn about non-hex color values that were skipped
  for (const group of COLOR_GROUPS) {
    const allRe = new RegExp(`--color-${group}-(\\d+):\\s*([^;]+)`, 'g')
    let match
    while ((match = allRe.exec(css)) !== null) {
      const shade = match[1]
      const value = match[2].trim()
      if (!colors[group][shade]) {
        console.warn(
          `Warning: --color-${group}-${shade} uses non-hex value "${value}" and was skipped`
        )
      }
    }
  }

  return colors
}

function generateColorsJS(colors) {
  const lines = [
    '/**',
    ' * VolleyKit Color Tokens (JS)',
    ' *',
    ' * AUTO-GENERATED from design-tokens.css — do not edit manually.',
    ' * Run `pnpm run generate:tokens` to regenerate.',
    ' */',
    '',
  ]

  for (const group of COLOR_GROUPS) {
    const shades = colors[group]
    const keys = Object.keys(shades).sort((a, b) => Number(a) - Number(b))

    lines.push(`const ${group} = {`)
    for (const key of keys) {
      lines.push(`  ${key}: '${shades[key]}',`)
    }
    lines.push('}')
    lines.push('')
  }

  lines.push(`module.exports = { ${COLOR_GROUPS.join(', ')} }`)
  lines.push('')

  return lines.join('\n')
}

// --- Main ---

const css = readFileSync(CSS_PATH, 'utf8')
const colors = parseDesignTokens(css)

// Validate that we found colors for every group
for (const group of COLOR_GROUPS) {
  const count = Object.keys(colors[group]).length
  if (count === 0) {
    console.error(`Error: no color shades found for "${group}" in design-tokens.css`)
    process.exit(1)
  }
}

const generated = generateColorsJS(colors)

const isCheck = process.argv.includes('--check')

if (isCheck) {
  const existing = readFileSync(JS_PATH, 'utf8')
  if (existing !== generated) {
    console.error('colors.js is out of date. Run `pnpm run generate:tokens` to regenerate.')
    process.exit(1)
  }
  console.log('colors.js is up to date.')
  process.exit(0)
}

writeFileSync(JS_PATH, generated, 'utf8')
console.log('Generated packages/shared/styles/colors.js from design-tokens.css')
