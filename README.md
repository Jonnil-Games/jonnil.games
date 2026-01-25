# Jonnil Games Website

Welcome to the `jonnil.games` website repository. This powers our static site (home, games, blog) with a minimal, DRY-first workflow.

⸻

✨ Philosophy

We follow these principles:

- Modular: Reusable components (partials) instead of copy/paste
- DRY: Single source of truth for header, footer, layout
- Readable: Intuitive structure, consistent naming, clear headers
- Vanilla-first: Plain HTML/CSS/JS; no heavy frameworks
- Accessible & Inclusive: Semantic, maintainable, friendly

⸻

📁 Folder Structure

```
project-root/
├── src/
│ ├── pages/ # Page templates (e.g., index.html, about.html, games/*)
│ ├── components/ # Reusable UI via <cyan component="…"></cyan>
│ │ ├── header/
│ │ │ ├── header.html
│ │ │ └── header.css
│ │ └── footer/
│ │ ├── footer.html
│ │ ├── footer.css
│ │ └── footer.js
│ ├── styles/ # Global CSS
│ │ ├── variables.css # Auto-injected into public/styles.css
│ │ └── base.css # Base styles (merged in build)
│ ├── assets/ # Images, fonts, icons → copied to /public (root)
│ └── blog/ # Blog posts, templates, styles, scripts
├── public/ # Generated output (do not edit)
├── build.js # Site builder
├── netlify.toml # Netlify deploy config
└── package.json # Scripts & dependencies
```

⸻

🚀 Quick Start

1. Install

```bash
npm install
```

2. Develop (auto-rebuild + live preview)

```bash
npm run dev
# Rebuilds on changes under src/ and serves public/ with live reload
```

3. Build

```bash
npm run build
```

4. Preview build locally

```bash
npx serve public/
```

5. Deploy (Netlify)

`netlify.toml` uses:

```toml
[build]
command = "npm run build"
publish = "public"
```

⸻

🧩 How the Build Works

`node build.js` will:

- Clean `public/`
- Process all `.html` under `src/pages/` (including subfolders), injecting `<cyan component="…"></cyan>` with the component’s HTML
- Inject components into blog templates (`src/blog/templates/`), so you can use the same `<cyan component="…"></cyan>` tags there too
- Bundle CSS into `public/styles.css`: `variables.css` + `base.css` + per-component CSS (between markers `/* BEGIN/END COMPONENT STYLES */`)
- Copy static assets from `src/assets/` into `public/` root (e.g., `src/assets/images/foo.png` → `/images/foo.png`)
- Copy component scripts (if present) into `public/components/<name>/<name>.js` and auto-inject `<script>` tags for any components used on a page
- Build the blog from Markdown using Handlebars templates under `src/blog/templates/`
- Generate blog feeds (`/blog/rss.xml`, `/blog/atom.xml`), a `recent-posts.json`, and `public/sitemap.xml`

⸻

📰 Blog

- Write posts in `src/blog/posts/*.md` with front matter (`title`, `author`, `date`, optional `categories`, `excerpt`, `draft`)
- Templates live in `src/blog/templates/` and can use `<cyan component="…"></cyan>`
- Build with `npm run build`
- Outputs to `public/blog/`, including:
  - `index.html` (with author/category filters + search UI)
  - One HTML file per post
  - `styles.css` and `scripts/` copied over
  - `recent-posts.json` (latest N posts; default 3) used by the homepage
  - `rss.xml` and `atom.xml`

Helpers:

- `formatDate` renders readable dates
- `blogUrl` helper builds `/blog/<file>` links
- `slug` helper builds URL-friendly slugs
- `truncate` helper shortens a string to a max length

Blog env flags:

- `BLOG_INCLUDE_DRAFTS=1` to include draft posts
- `BLOG_RECENT_COUNT` to control the number of posts in `recent-posts.json`
- `BLOG_TITLE`, `BLOG_DESC`, `BLOG_LANG`, `BLOG_AUTHOR` to control feed metadata

⸻

🏷 File Header Convention

Add a short header to new files:

```html
<!--
  jonnil.games – footer.html
  Purpose: Site-wide footer partial.
  Notes: Update when links change.
-->
```

```css
/*
  jonnil.games – base.css
  Purpose: Global styles.
  Notes: Uses CSS variables from variables.css.
*/
```

⸻

🔄 Using Components

1. Create `src/components/<name>/`
2. Add:

- `<name>.html` (markup)
- optional `<name>.css` (styles)
- optional `<name>.js` (behavior) — component JS is copied to `public/components/<name>/<name>.js` and auto-injected on pages where the component appears.

3. In any page template:

```html
<cyan component="<name>"></cyan>
```

4. Rebuild (`npm run build`) — the component is injected into pages in `src/pages/` and its CSS is bundled into `public/styles.css`.

⸻

📄 Adding Pages & Assets

- Pages: Put `.html` in `src/pages/` (including subfolders). Use component tags for header/footer.
- Assets: Place images in `src/assets/images/` and reference them as `/images/...`.

⸻

🌐 Netlify Details

- Redirects: `/blog/*` → `/blog/:splat`, and a catch‑all to `/index.html`
- Security headers are set in `netlify.toml`
- Netlify runs `npm run build` and publishes `public/`
- `SITE_URL` is set in production to generate absolute canonicals/feeds/sitemap; previews use Netlify-provided URLs

⸻

🤝 Contributing

1. Create/update pages in `src/pages/`
2. Extract repeated UI into `src/components/`
3. Update global styles in `src/styles/` if needed
4. Run `npm run build` and verify `public/`
5. Commit with a clear message, open a PR, celebrate 🎉

If you’re copy‑pasting, stop and make a component. That’s how we keep this site DRY, maintainable, and joyful to work on. 🐾
