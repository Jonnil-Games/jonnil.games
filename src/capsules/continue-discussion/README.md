# Continue Discussion Capsule

A reusable CTA card for blog posts that invites readers to continue the
conversation on Bluesky or Discord. It is styled to match the Follow Updates
capsule via shared base styles.

## Usage

```html
<drop capsule="continue-discussion"></drop>
```

The build pipeline injects the capsule HTML automatically. There is no capsule
JS for this one.

## Behavior

- Static content only (no script).
- Uses shared classes from `src/styles/base.css` such as
  `newsletter-section`, `info-card`, `action-links`, and button styles.

## Files

- `continue-discussion.html` - Markup for the CTA card
