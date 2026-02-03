# Header Capsule

A responsive navigation header capsule for the Jonnil Games website with mobile menu support.

## Features

- Responsive design with both desktop and mobile layouts
- Mobile hamburger menu with animation
- Automatic active link highlighting based on current page
- Social links in mobile menu
- Accessibility support with ARIA attributes
- Smooth animations and transitions

## Usage

### 1. Include the Capsule Files

Add the following to the `<head>` of your HTML file:

```html
<!-- Header Capsule -->
<link rel="stylesheet" href="/src/capsules/header/header.css" />
```

Add the following just before the closing `</body>` tag:

```html
<!-- Header Capsule Script -->
<script src="/src/capsules/header/header.js"></script>
```

### 2. Insert the Header HTML

Place the following code at the beginning of your `<body>` section:

```html
<!-- Include the header capsule -->
<div id="header-container"></div>
<script>
  fetch("/src/capsules/header/header.html")
    .then((response) => response.text())
    .then((html) => {
      document.getElementById("header-container").innerHTML = html;
    });
</script>
```

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

## Structure

- `header.html` - The HTML structure of the header capsule
- `header.css` - Styles for the header capsule
- `header.js` - JavaScript functionality for the header capsule
- `README.md` - Documentation for the header capsule

## Accessibility

This header capsule includes the following accessibility features:

- ARIA attributes for the mobile menu toggle
- Proper focus management
- Semantic HTML structure
- Keyboard navigation support

## Browser Support

This capsule is compatible with all modern browsers. Internet Explorer is not supported.
