# Footer Component

A responsive site-wide footer component that includes social links, navigation, contact information, and legal links.

## Usage

```html
<cyan component="footer"></cyan>
```

## Dependencies

- Requires `variables.css` for styling variables
- Uses Remixicon for social media icons (`ri-*` classes)

## Structure

- Social media links section
- Quick navigation links
- Contact information
- Copyright and legal links

## Customization

The footer uses CSS variables from `variables.css` for colors, spacing, and transitions. To modify the appearance, adjust these variables in your project's CSS:

- `--container-width`
- `--spacing-*` (sm, md, lg, xl)
- `--text-muted`
- `--primary-color`
- `--border-color`
