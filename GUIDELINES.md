# 🧱 The Cyan Stack – Project Structure & Build Guidelines

This document formalizes the Cyan Stack: a structured, modular, and fully static site-building system based on modern web standards. It defines our project architecture, reusable component strategy, styling methodology, and build process to ensure clean, maintainable, and scalable development for all Cyan-led projects—including Jonnil Games.

---

## 🧠 Philosophy

- **Modular**: Code is broken into small, self-contained, reusable parts.
- **Readable**: File structure and code should be intuitive and consistent.
- **Vanilla-First**: Built on plain HTML, CSS, and JavaScript using web standards.
- **Pre-Built**: All content is compiled at build time to static HTML.
- **Neurodivergent-Friendly**: Organized for clarity and flexibility to reduce cognitive overhead.

---

## 📁 Folder Structure Overview

```
cyan-stack/
├── public/               # Final output, served by Netlify
│   ├── index.html
│   ├── about.html
│   ├── blog/
│   ├── styles.css
│   └── assets/
│
├── src/                  # Source files
│   ├── pages/            # Page templates
│   ├── components/       # Reusable layout elements
│   ├── styles/           # Global styles & CSS variables
│   ├── data/             # JSON/JS content config
│   └── scripts/          # Optional client-side JS
│
├── build.js              # Custom build script
├── netlify.toml          # Netlify config
├── README.md
└── GUIDELINES.md         # This file
```

---

## 🧩 Component System

### Structure

Each component resides in its own folder within `src/components/` and contains:

- `component-name.html` — HTML partial
- `component-name.css` — Scoped styles
- `README.md` — Documentation and usage

### Example

```
src/components/header/
├── header.html
├── header.css
└── README.md
```

### Usage

Components are injected into page templates using placeholders like:

```html
<!-- HEADER -->
```

The build system replaces these with the component’s HTML and optionally pulls in the styles.

---

## 🎨 Styling System

### Global Styles

Located in `src/styles/`, global CSS files define the base appearance of the site:

- `variables.css` — Design tokens (colors, spacing, etc.)
- `reset.css` — CSS reset/normalization
- `base.css` — Typography, general rules
- `layout.css` — Grid/flex helpers

### Component Styles

Each component folder includes its own `component-name.css`, allowing styles to be modular and scoped.

### Build Output

All styles are compiled into `public/styles.css` during the build step.

---

## ✏️ Page Templates System

Pages live in `src/pages/` and represent the raw content before the build. Each HTML file may include placeholders for components.

Example:

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <!-- HEADER -->
    <main>
      <h1>Welcome!</h1>
    </main>
    <!-- FOOTER -->
  </body>
</html>
```

---

## 📰 Blog System

### Structure

The blog lives in its own folder under `src/blog/` and is managed separately from static pages.

```
src/blog/
├── posts/                # Markdown or HTML blog entries
├── templates/            # Page and post templates
├── recent-posts.json     # Optional feed generation
└── build-blog.js         # Custom builder for blog output
```

### Features

- Automatically generates pages for individual blog posts
- Outputs to `public/blog/`
- Can be integrated into other pages (e.g. home, sidebar)

### Future Enhancements

- Markdown support
- Pagination
- RSS generation

---

## ⚙️ Build System

### Main Script: `build.js`

This custom build script does the following:

1. Scans `src/pages/` for `.html` files
2. Replaces component placeholders with actual component markup
3. Combines all universal and component styles into one stylesheet
4. Outputs completed pages to `public/`

### Component Injection

Components are matched by folder name (e.g. `<!-- HEADER -->` → `src/components/header/`). The HTML is injected into the page, and the CSS is either injected inline or added to the global style output.

---

## 🚀 Roadmap & Future Improvements

- CLI helpers for creating new components with boilerplate
- Dark mode toggle using CSS variables
- Minification and cache busting

---

Built with love, structure, and occasional cat hair. 💖

— Cyan
