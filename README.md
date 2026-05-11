# Jonnil Games Website

Static site for `jonnil.games`: pages, games, team info, blog, feeds, webmentions, and post-deploy syndication.

[![Netlify Status](https://api.netlify.com/api/v1/badges/0d1fa51c-f8c6-4efe-9a24-0c6c87053fa3/deploy-status)](https://app.netlify.com/projects/jonnil/deploys)

## Requirements

- Node.js 24 or newer
- npm

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run format
```

`npm run dev` builds once, then serves `public/` on port `3001`. It does not watch files.

## Repository Layout

```text
.
├── build.js                         # static site builder
├── lib/                             # shared URL and syndication helpers
├── netlify.toml                     # Netlify build, redirects, headers, edge functions
├── netlify/
│   ├── edge-functions/              # bot and agents endpoints
│   ├── functions/                   # serverless functions
│   ├── plugins/post-deploy-syndication/
│   └── post-deploy/run-syndication.js
├── src/
│   ├── .well-known/                 # copied to public/.well-known/
│   ├── assets/                      # copied to public/
│   ├── blog/                        # Markdown posts, templates, styles, scripts
│   ├── capsules/                    # reusable HTML/CSS/JS fragments
│   ├── config.json                  # fonts, metadata, rel=me links
│   ├── pages/                       # static pages and game pages
│   └── styles/                      # bundled into public/styles.css
└── public/                          # generated output, do not edit
```

## Build Pipeline

`npm run build` runs `node build.js`.

The builder:

- Deletes and recreates `public/`
- Processes every file under `src/pages/`
- Expands `<drop capsule="name"></drop>` tags
- Injects shared resources from `src/config.json`
- Adds canonical URLs using `https://jonnil.games`
- Adds `/scripts/i18n-init.js` where needed
- Writes global CSS to `public/styles.css`
- Writes shared JS to `public/scripts.js`
- Copies standalone scripts such as `i18n-init.js` to `public/scripts/`
- Copies used capsule scripts to `public/capsules/<name>/<name>.js`
- Copies `src/assets/` to `public/`
- Copies `src/.well-known/` to `public/.well-known/`
- Copies `lib/sanitize-url.js` to `public/lib/sanitize-url.js`
- Builds the blog into `public/blog/`
- Generates `public/blog/rss.xml`, `public/blog/atom.xml`, `public/blog/recent-posts.json`, and `public/blog/sticky-paws-changelog.json`

## Pages

Add or edit static pages in `src/pages/`.

HTML files are processed by the build. Non-HTML files under `src/pages/` are copied as-is, which is how game-specific images and styles are handled.

Canonical paths:

- `src/pages/index.html` -> `/`
- `src/pages/about.html` -> `/about.html`
- `src/pages/games/sticky/index.html` -> `/games/sticky/`

## Assets

Put shared assets under `src/assets/`.

Examples:

- `src/assets/images/example.png` -> `/images/example.png`
- `src/assets/icons/example.svg` -> `/icons/example.svg`
- `src/assets/i18n/en.json` -> `/i18n/en.json`

Page-local assets can live beside a page under `src/pages/`; those are copied to the same relative path in `public/`.

## Capsules

Capsules are reusable site fragments.

Use one in a page or blog template:

```html
<drop capsule="header"></drop>
```

Create one with:

```text
src/capsules/<name>/<name>.html
src/capsules/<name>/<name>.css
src/capsules/<name>/<name>.js
```

Only the HTML file is required. CSS is bundled into `public/styles.css`. JS is copied and injected only when that capsule is used.

Current capsules:

- `header`
- `footer`
- `follow-updates`
- `continue-discussion`

## Blog

Posts live in `src/blog/posts/*.md`. The filename is the slug.

Example:

```yaml
---
title: "Post title"
date: "2026-05-11"
author: "Jonnil"
excerpt: "Short summary for cards, feeds, and social previews."
image: "/images/example.png"
categories:
  - "News"
  - "Sticky Paws"
---
```

Required:

- `date`: `YYYY-MM-DD` or ISO 8601

Recommended:

- `title`: defaults to filename when missing
- `author`: defaults to `Jonnil Games`
- `excerpt`: falls back to the first 180 plain-text characters
- `categories`: first category powers the blog filter and card badge
- `image`: social preview image, defaults to `/images/og-preview.png`

Optional:

```yaml
draft: true
canonical: "https://example.com/post"
webmentionTarget: "https://example.com/social-post"
```

Drafts are skipped unless `BLOG_INCLUDE_DRAFTS=1` is set.

## Blog Localization

Posts can include localized body sections:

```markdown
Default-language body.

:::lang sv

Swedish body.

:::
```

Add localized metadata when needed:

```yaml
defaultLanguage: "en"
languages:
  - "en"
  - "sv"
translations:
  sv:
    title: "Localized title"
    excerpt: "Localized excerpt."
```

Translation entries can also provide `author`, `categories`, and body content via `body`, `content`, or `markdown`.

## Blog Syndication

Production deploys run `netlify/plugins/post-deploy-syndication`, which calls `netlify/post-deploy/run-syndication.js`.

To request syndication for a post:

```yaml
syndicate:
  - "bluesky"
  - "discord"
```

Supported targets:

- `bluesky`: published through Bridgy
- `discord`: published through `DISCORD_WEBHOOK_URL`

After syndication, automation writes state back into the post frontmatter:

```yaml
syndication:
  bluesky: "https://bsky.app/..."
  discord: "https://discord.com/..."
syndicationStatus:
  bluesky: "confirmed"
  discord: "confirmed"
syndicationComplete: true
```

Do not add those state fields by hand unless repairing a failed publish.

Required Netlify/GitHub env for writeback:

- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH` optional, defaults to `main`

Discord also needs:

- `DISCORD_WEBHOOK_URL`

## Blog Outputs

The blog build writes:

- `public/blog/index.html`
- `public/blog/<slug>/index.html`
- `public/blog/styles.css`
- `public/blog/scripts/`
- `public/blog/recent-posts.json`
- `public/blog/sticky-paws-changelog.json`
- `public/blog/rss.xml`
- `public/blog/atom.xml`

Feed metadata can be adjusted with:

- `BLOG_TITLE`
- `BLOG_DESC`
- `BLOG_LANG`
- `BLOG_AUTHOR`
- `BLOG_RECENT_COUNT`
- `BLOG_EMPTY_FEED_UPDATED`

## Webmentions

Blog pages include webmention UI. Runtime fetching uses:

- `netlify/functions/webmentions.js`
- `src/blog/scripts/webmentions.js`

Build-time webmention fetching is currently disabled in `build.js`.

## Netlify

Netlify uses:

```toml
[build]
publish = "public"
command = "npm run build"
```

`netlify.toml` also configures:

- Node 24
- post-deploy syndication plugin
- edge function routing for `/*`
- Discord and Bluesky redirects
- feed aliases
- legal page aliases
- security, cache, feed, and `.well-known` headers
- 404 fallback to `/404.html`

## Site Config

`src/config.json` controls shared build-time metadata:

- Google Fonts resource injection
- global title fallback
- `rel=me` links

Canonical URLs always use `https://jonnil.games`, including deploy previews.

## Editing Rules

- Edit files under `src/`, `lib/`, `netlify/`, or root config
- Do not edit `public/` by hand
- Run `npm run build` before publishing site changes
- Run `npm run lint` for JavaScript changes
