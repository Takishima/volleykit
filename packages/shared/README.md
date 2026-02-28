# @volleykit/shared

Shared code between VolleyKit web and mobile apps (~70% code sharing).

## Exports

```typescript
import { useAssignments } from '@volleykit/shared/hooks'
import { useAuthStore } from '@volleykit/shared/stores'
import { apiClient } from '@volleykit/shared/api'
import { formatDate } from '@volleykit/shared/utils'
import { t } from '@volleykit/shared/i18n'
```

| Export      | Contents                                |
| ----------- | --------------------------------------- |
| `/api`      | API client, query keys, generated types |
| `/hooks`    | TanStack Query hooks for all endpoints  |
| `/stores`   | Zustand stores (auth, settings, etc.)   |
| `/i18n`     | Translations (de, en, fr, it)           |
| `/utils`    | Date formatting, validation helpers     |
| `/types`    | Shared TypeScript types                 |
| `/adapters` | Platform-specific adapters              |

## Development

```bash
pnpm run dev          # Watch mode
pnpm run build        # Build with tsup
pnpm test             # Run tests
pnpm run typecheck    # TypeScript check
```

## API Types

Generated from OpenAPI spec. Regenerate with:

```bash
cd ../web-app && pnpm run generate:api
```
