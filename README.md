# VolleyKit

[![CI - Web App](https://github.com/Takishima/volleykit/actions/workflows/ci-web.yml/badge.svg)](https://github.com/Takishima/volleykit/actions/workflows/ci-web.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A mobile-friendly web app for Swiss volleyball referees, providing an improved interface to [volleymanager.volleyball.ch](https://volleymanager.volleyball.ch).

## Features

- View upcoming match assignments
- Track compensation records
- Browse game exchange marketplace
- Works offline (PWA)

## Quick Start

```bash
cd web-app && npm install && npm run dev
```

Or with [devenv](https://devenv.sh):

```bash
devenv shell
dev
```

Then open http://localhost:5173

## Documentation

- [Development Guide](./CLAUDE.md) - Detailed development guidelines and conventions
- [API Documentation](./docs/api/README.md) - OpenAPI spec and API details

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
