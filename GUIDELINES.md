# 🧱 The Cyan Stack – Project Structure & Build Guidelines

This document formalizes our approach to structuring and building websites under the Cyan Stack. It outlines our philosophy, file organization, component system, styling strategy, and build process to ensure consistency, scalability, and good vibes across all projects, including Jonnil Games (which may eventually have its own specialized stack).

---

## 🧠 Philosophy

- **Modular**: Everything should be broken into reusable, self-contained parts.
- **Readable**: Structure should be easy to navigate and understand.
- **Vanilla-First**: Built using modern web standards—HTML, CSS, JS—without unnecessary frameworks.
- **Buildable**: Pages are assembled at build time, allowing us to serve static, SEO-friendly HTML.
- **Brain-Friendly**: Designed for creative flow, neurodivergent accessibility, and maximum control.

---

## 📁 Folder Structure

```
cyan-stack/
├── public/               # Final output, served by Netlify
│   ├── index.html
│   ├── about.html
│   ├── blog/
│   ├── styles.css        # Compiled universal + component styles
│   └── assets/           # Images, fonts, favicons, etc.
│
├── src/                  # Source files, not served directly
│   ├── pages/            # Raw HTML content for each page
│   ├── components/       # Self-contained folders for each reusable component
│   │   ├── header/
│   │   │   ├── header.html
│   │   │   ├── header.css
│   │   │   └── README.md
│   │   ├── footer/
│   │   │   ├── footer.html
│   │   │   ├── footer.css
│   │   │   └── README.md
│   │   └── ...
│   ├── styles/           # Universal styles and CSS variables
│   │   ├── variables.css
│   │   ├── base.css
│   │   ├── layout.css
│   │   └── reset.css
│   ├── data/             # Site-wide JSON or JS data (e.g. team bios, config)
│   └── scripts/          # Web Components or client-side JS
│
├── build.js              # Custom build script that assembles everything
├── netlify.toml          # Netlify deployment config
└── README.md
```

---

## 🧩 Component System

Each component lives in its own subfolder under `src/components/` and consists of:

- An `.html` partial with reusable markup
- A `.css` file with scoped styles
- A `README.md` file explaining what the component does and how to use it

These components are injected into page templates during the build process.

**Example: `src/components/header/`**

```html
<!-- header.html -->
<header>
  <nav>
    <a href="/">Home</a>
    <a href="/games">Games</a>
    <a href="/blog">Blog</a>
  </nav>
</header>
```

```css
/* header.css */
header {
  background: var(--bg);
  color: var(--text);
  padding: 1rem;
}
```

```markdown
<!-- README.md -->

# Header Component

The main site header with navigation links. Used across all pages. Injected via build script.
```

---

## 🎨 Styling Strategy

- **CSS Variables** live in `src/styles/variables.css`
- **Universal Styles** (typography, layout, base resets) are split into modular CSS files
- **Component Styles** live alongside their HTML in `src/components/[name]/`

During the build:

- Component styles are collected and injected inline or bundled into `public/styles.css`
- Universal styles are merged or copied directly into `public/styles.css`

This keeps styles modular, editable, and themeable.

---

## ⚙️ Build Process

The `build.js` script does the following:

1. Reads all pages in `src/pages/`
2. Injects partials from `src/components/[name]/` where `<!-- HEADER -->`, etc., appear
3. Collects CSS from components and universal styles
4. Builds each page into `public/`
5. Outputs a single `public/styles.css` (or inlined styles, if preferred)

This makes our site static, fast, and crawlable—with no reliance on JavaScript for rendering structure or content.
