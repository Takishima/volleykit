# VolleyKit Help Site

Documentation and help pages built with Astro.

## Tech Stack

- Astro 6
- Tailwind CSS 4
- Pagefind (search)

## Development

```bash
pnpm run dev          # Start dev server
pnpm run build        # Build static site
pnpm run preview      # Preview production build
```

## Project Structure

```
src/
├── pages/            # Markdown/Astro pages
├── components/       # Astro components
├── layouts/          # Page layouts
└── i18n/             # Translations
public/
└── images/           # Screenshots and assets
```

## Adding Content

1. Create a new `.md` or `.astro` file in `src/pages/`
2. Add frontmatter with title and description
3. Build to regenerate search index

## Search

Search is powered by Pagefind and generated at build time:

```bash
pnpm run build  # Runs astro build && pagefind
```
