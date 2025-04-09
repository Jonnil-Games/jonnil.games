# 🏡 The Cyan Stack

This document formalizes the Cyan Stack: a structured, modular, and fully static site-building system based on modern web standards. It defines our project architecture, reusable component strategy, styling methodology, and build process to ensure clean, maintainable, and scalable development for all Cyan-led projects—including Jonnil Games.

---

## 🧠 Philosophy

- **Modular**: Code is broken into small, self-contained, reusable parts.
- **Readable**: File structure and code should be intuitive and consistent.
- **Vanilla-First**: Built on plain HTML, CSS, and JavaScript using web standards.
- **Pre-Built**: All content is compiled at build time to static HTML.
- **Neurodivergent-Friendly**: Organized for clarity and flexibility to reduce cognitive overhead.
- **Aesthetic-Driven**: The design should evoke comfort, clarity, and a little joy.

---

## 📁 Folder Structure Overview

```
cyan-stack/
├── public/               # Final output, served by Netlify
│   ├── index.html
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
└── README.md             # This file
```

> ⚠️ **Important**: All file paths pointing to local resources should start with `./` instead of `/`. This ensures the paths are relative to the site structure when published (e.g., on Netlify), not the system root.

---

## 💡 Unified Component Syntax

Cyan Stack uses a single unified component tag for injecting modular pieces into your pages:

```html
<cyan component="header"></cyan>
<cyan component="post-card" data-count="3"></cyan>
<cyan component="footer"></cyan>
```

- The `component` attribute corresponds to the folder and file names in `src/components/`
- Any `data-*` attributes are passed into the component and used by its JavaScript or styling logic

The build script finds all `<cyan>` elements and replaces them with the matching HTML partials during the build process.

---

## 🧹 Component Structure

Each component lives in its own folder and contains:

- `component-name.html` — HTML partial
- `component-name.css` — Scoped styles
- `component-name.js` — Optional behavior
- `README.md` — Component documentation

**Example:**

```
src/components/header/
├── header.html
├── header.css
├── header.js
└── README.md
```

Use like this:

```html
<cyan component="header"></cyan>
```

---

## 🏷 File Header Convention

Every file should include a Cyan Stack header comment explaining its purpose.

### CSS/JS:

```css
/* ======================================================
   ✅ Cyan Stack – [filename.ext]
   Purpose: [What this file does]
   Notes: [Extra details]
   ====================================================== */
```

### HTML:

```html
<!-- ======================================================
     ✅ Cyan Stack – [component-name].html
     Purpose: [Markup description]
     Notes: [Dependencies or usage context]
     ====================================================== -->
```

---

## 🎨 Styling System

### Global Styles

- `variables.css` – All colors, spacing, shadows, gradients, and more
- `reset.css` – Normalizes cross-browser defaults
- `base.css` – Typography, tags, form elements
- `layout.css` – Grid/flex utilities and spacing helpers

### Component Styles

Each component's CSS is self-contained and scoped. Avoid leaking into global styles.

---

## 🍸 Default Aesthetic: Glassmorphism

Cyan Stack embraces a glassy, soft aesthetic by default.

### Visual Rules:

- **No solid black or white.** Use layered `rgba` values with transparency.
- **Glassiness by default.** Use `backdrop-filter: blur(20px)` and `saturate(180%)`.
- **Soft corners.** Use `border-radius: 0.5rem` (or `1rem`/`2rem` for larger containers).
- **Subtle shadows.** Use soft drop shadows like `rgba(0, 0, 0, 0.1)`.
- **Gradients.** Use understated gradients with just a hint of color or light/dark shift.
- **Noise.** Overlay a subtle static noise texture (`noise.png`) with `opacity: 0.05–0.1`.

### Typography:

- Default font: system-ui stack (Apple, Windows, Linux, Android friendly)
- Font size: `1rem` (16px) base
- Line height: `1.6` minimum for readability

---

## 🎞️ Animation & Motion

All animations should feel **smooth, bouncy, and joyful**.

- Use `cubic-bezier(0.68, -0.55, 0.27, 1.55)` for expressive spring-like movement.
- Animate transforms or opacity—not layout or size.
- Use short, predictable durations (200–500ms).
- Hover/focus states should feel snappy and rewarding.

---

## ✏️ Page Templates

Pages live in `src/pages/` and include `<cyan>` component tags:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <cyan component="header"></cyan>
    <main>
      <h1>Hello, Cyan Stack!</h1>
    </main>
    <cyan component="footer"></cyan>
    <script src="./scripts.js" defer></script>
  </body>
</html>
```

> 📌 Always prefix internal paths (like to styles or scripts) with `./` to avoid referencing system root paths that break on Netlify and similar platforms.

---

## ⚙️ Build System

Run:

```bash
node build.js
```

This will:

1. Replace all `<cyan component="...">` with the correct HTML from `src/components/`
2. Bundle all styles into `public/styles.css`
3. Bundle scripts into `public/scripts.js`
4. Output everything to `/public`

Serve locally using Python or `serve`:

```bash
npx serve public
```

---

## 🧪 Testing / Development Tips

- Start with the included `index.html` to test your setup.
- Use `<cyan component="...">` for all modular elements.
- Check keyboard focus, ARIA attributes, and mobile behaviors.

---

Built with transparency, softness, and just a bit of shimmer.
– Cyan 💖
