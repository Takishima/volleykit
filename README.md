# VolleyKit

[![CI](https://github.com/Takishima/volleykit/actions/workflows/ci.yml/badge.svg)](https://github.com/Takishima/volleykit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A multi-platform app suite for Swiss volleyball referees, providing an improved interface to [volleymanager.volleyball.ch](https://volleymanager.volleyball.ch).

## Applications

| App | Location | Description |
|-----|----------|-------------|
| Web App (PWA) | [`web-app/`](./web-app/) | React 19 + Vite 7 + Tailwind 4 |
| Mobile App | [`packages/mobile/`](./packages/mobile/) | React Native 0.79 + Expo 53 |
| Shared Package | [`packages/shared/`](./packages/shared/) | API client, hooks, stores, i18n |
| Help Site | [`help-site/`](./help-site/) | Astro 6 documentation |
| CORS Proxy | [`worker/`](./worker/) | Cloudflare Worker |

## Quick Start

```bash
npm install                        # Install all dependencies
cd web-app && npm run dev          # Start web dev server (localhost:5173)
cd packages/mobile && npm start    # Start Expo dev server
```

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](./CLAUDE.md) | Development guide and conventions |
| [API Docs](./docs/api/README.md) | OpenAPI spec and endpoints |
| [Code Patterns](./docs/CODE_PATTERNS.md) | Code examples and best practices |
| [Testing Strategy](./docs/TESTING_STRATEGY.md) | Testing guidelines |
| [Security Checklist](./docs/SECURITY_CHECKLIST.md) | Security review guide |
| [Validation](./docs/VALIDATION.md) | Build validation and bundle limits |

## Legal & Privacy

**Unofficial application** - not affiliated with Swiss Volley. All volleyball data is property of Swiss Volley.

No data collection, no analytics. All data flows directly to Swiss Volley's servers.

## License

MIT - applies to application code only.
