# Footer Capsule

A site-wide footer capsule that includes social links, navigation, contact
information, and legal links.

## Usage

```html
<drop capsule="footer"></drop>
```

The build pipeline injects the capsule HTML and auto-injects the capsule script
if present.

## Behavior

- `footer.js` keeps the copyright year current.
- Styling is driven by shared base styles in `src/styles/base.css`.
- Remixicon classes (`ri-*`) are used for social icons and the copyright icon.

## Files

- `footer.html` - Markup for the footer
- `footer.css` - Reserved for small overrides (base styles live in `base.css`)
- `footer.js` - Sets the current year

## Customization

Most styling is controlled by CSS variables in `src/styles/variables.css`, such
as:

- `--container-width`
- `--spacing-*` (sm, md, lg, xl)
- `--text-muted`
- `--primary-color`
- `--border-color`
