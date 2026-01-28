# VolleyKit Help Site

Documentation and help pages built with Astro.

## Tech Stack

- Astro 6
- Tailwind CSS 4
- Pagefind (search)

## Development

```bash
npm run dev           # Start dev server
npm run build         # Build static site
npm run preview       # Preview production build
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
npm run build  # Runs astro build && pagefind
```
