# VolleyKit Web App

A Progressive Web App (PWA) for Swiss volleyball referee management.

## Tech Stack

- React 19 + TypeScript 5.9
- Vite 7 (build)
- Tailwind CSS 4 (styling)
- Zustand 5 (client state)
- TanStack Query 5 (server state)
- React Router 7 (routing)
- Zod 4 (validation)

## Features

| Feature       | Description                                         |
| ------------- | --------------------------------------------------- |
| Assignments   | View/validate match assignments with swipe gestures |
| Compensations | Track fees, expenses, export PDF reports            |
| Game Exchange | Browse marketplace, filter by distance/level        |
| Transport     | Swiss public transport integration (OJP SDK)        |
| OCR           | Receipt scanning for expense entry                  |
| Offline       | Service worker caching, installable PWA             |

## Development

```bash
npm install
npm run dev           # Start dev server (localhost:5173)
npm run build         # Production build
npm run lint          # ESLint check
npm test              # Unit tests (Vitest)
npm run test:e2e      # E2E tests (Playwright)
```

## Project Structure

```
src/
├── features/         # Feature modules (assignments, auth, compensations, etc.)
├── shared/           # Shared components, hooks, utils
├── api/              # API client and generated types
├── i18n/             # Translations (de, en, fr, it)
└── contexts/         # React contexts
e2e/
├── pages/            # Page Object Models
└── *.spec.ts         # E2E test specs
```

## Bundle Limits

See [VALIDATION.md](../docs/VALIDATION.md) for size limits and build checks.
