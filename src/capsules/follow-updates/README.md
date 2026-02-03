# Follow Updates Capsule

A reusable card used to link to RSS, Bluesky, and Discord.

## Usage

Add the capsule tag where the card should appear:

```html
<drop capsule="follow-updates"></drop>
```

The build pipeline injects the capsule HTML automatically. There is no capsule
JS for this one.

## Behavior

- Static content only (no script).
- Uses shared classes from `src/styles/base.css` such as
  `newsletter-section`, `info-card`, `action-links`, and button styles.
- Includes Remixicon icons (`ri-*` classes) for RSS/Bluesky/Discord.

## Files

- `follow-updates.html` - Markup for the follow updates card
