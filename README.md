# VolleyKit

[![CI](https://github.com/Takishima/volleykit/actions/workflows/ci.yml/badge.svg)](https://github.com/Takishima/volleykit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A mobile-friendly Progressive Web App (PWA) for Swiss volleyball referees, providing an improved interface to [volleymanager.volleyball.ch](https://volleymanager.volleyball.ch).

## Features

### Assignment Management

- View upcoming match assignments with detailed game information
- Swipe gestures for quick actions (validate, exchange, edit compensation)
- Game validation wizard with roster verification and scorer assignment
- Generate sports hall reports for NLA/NLB games
- Full address display with navigation buttons (Apple/Google Maps)

### Compensation Tracking

- View all referee compensations including game fees and travel expenses
- Edit compensation details directly from the app
- Export compensation reports as PDF

### Game Exchange

- Browse the game exchange marketplace
- Filter by distance, travel time, and game level
- Take over games from other referees with confirmation flow
- Put your assignments up for exchange

### Swiss Public Transport Integration

- Real-time travel time calculations via OJP SDK
- Filter assignments by reachability from your home location
- Direct SBB deep links for route planning

### Progressive Web App

- Works offline with service worker caching
- Installable on mobile devices
- Auto-updating with reload prompts
- Multi-language support (German, English, French, Italian)
- Interactive guided tour for new users

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 with TypeScript 5.9 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 (client), TanStack Query 5 (server) |
| Routing | React Router 7 |
| Validation | Zod 4 |
| Testing | Vitest 4, React Testing Library, Playwright |
| CORS Proxy | Cloudflare Workers |
| Transport | OJP SDK (Swiss public transport) |

## Project Structure

```
volleykit/
├── web-app/          # React PWA
├── worker/           # Cloudflare Worker CORS proxy
└── docs/             # API documentation and guides
```

## Quick Start

### With devenv (Recommended)

```bash
devenv shell    # Enter development environment
dev             # Start dev server
```

### Without Nix

```bash
cd web-app && npm install && npm run dev
```

Then open http://localhost:5173

## Development Commands

```bash
# Web App (from web-app/)
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # ESLint check
npm test              # Run unit tests
npm run test:e2e      # Run E2E tests

# Worker (from worker/)
npm run dev           # Local worker dev
npx wrangler deploy   # Deploy to Cloudflare
```

## Documentation

- [Development Guide](./CLAUDE.md) - Detailed development guidelines and conventions
- [API Documentation](./docs/api/README.md) - OpenAPI spec and API details
- [Security Checklist](./docs/SECURITY_CHECKLIST.md) - Security review guide
- [Code Patterns](./docs/CODE_PATTERNS.md) - Code examples and patterns

## Legal Notice & Data Ownership

**This is an unofficial application** for personal use. It is not affiliated with or endorsed by Swiss Volley.

- All data is property of **Swiss Volley**
- No Swiss Volley logos or trademarks are used
- For official information, visit [volleymanager.volleyball.ch](https://volleymanager.volleyball.ch)

## Privacy

- **No data collection** - VolleyKit does not collect or store personal data
- **Direct communication** - All data flows directly to Swiss Volley's servers
- **No analytics** - No tracking or telemetry

## License

MIT - applies to the application code only. All volleyball data is property of Swiss Volley.
