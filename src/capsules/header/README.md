# Header Capsule

A responsive navigation header capsule for the Jonnil Games website with mobile
menu support and active link highlighting.

## Features

- Responsive desktop and mobile layouts
- Mobile hamburger menu with accessible toggling
- Automatic active link highlighting based on current URL
- Social links in the mobile menu
- Accessibility support with ARIA attributes and focus management

## Usage

```html
<drop capsule="header"></drop>
```

The build pipeline injects the capsule HTML and auto-injects the capsule script
when this capsule is used on a page.

## Customization

### Modifying Navigation Links

To change the navigation links, update both the desktop and mobile navigation sections in `header.html`:

```html
<!-- Desktop Navigation Links -->
<ul class="nav-links">
  <li><a href="/">Home</a></li>
  <li><a href="/your-page.html">Your Page</a></li>
  <!-- Add more links as needed -->
</ul>

<!-- Mobile Navigation Links (in mobile-menu section) -->
<ul class="mobile-nav-links">
  <li><a href="/">Home</a></li>
  <li><a href="/your-page.html">Your Page</a></li>
  <!-- Add more links as needed -->
</ul>
```

### Changing Social Media Links

Update the social media links in the mobile menu section of `header.html`.

## Behavior

- `header.js`:
  - Highlights active nav links (desktop and mobile).
  - Handles opening/closing the mobile menu, including Escape key and resize.
  - Keeps the mobile footer year current.
  - Emoji rendering is handled by the shared `/scripts/emoji.js`.

## Files

- `header.html` - Markup for the header and mobile menu
- `header.css` - Reserved for small overrides (base styles live in `base.css`)
- `header.js` - Header behavior

## Accessibility

- ARIA attributes for the menu toggle and dialog
- Focus management when opening/closing the mobile menu
- Semantic nav structure with clear link targets

## Browser Support

Modern browsers only. Internet Explorer is not supported.
