import js from '@eslint/js'
import eslintPluginAstro from 'eslint-plugin-astro'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/', '.astro/', 'public/'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,mjs}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  ...eslintPluginAstro.configs['flat/recommended'],
  ...eslintPluginAstro.configs['flat/jsx-a11y-recommended'],
  // Tailwind 4: flag classes that do not exist in the design system / config
  // and conflicting utilities. Class ordering is left to the author.
  {
    files: ['src/**/*.astro'],
    plugins: { 'better-tailwindcss': betterTailwindcss },
    settings: {
      'better-tailwindcss': { entryPoint: 'src/styles/global.css' },
    },
    rules: {
      ...betterTailwindcss.configs['correctness-error'].rules,
      'better-tailwindcss/no-unknown-classes': [
        'error',
        {
          ignore: [
            // @tailwindcss/typography styles `.lead` inside `.prose`
            'lead',
            // JavaScript hooks for the device-switcher script, not styling
            'device-tab',
            'device-panel',
          ],
        },
      ],
    },
  }
)
