# Header Component

The header component provides the site's navigation interface, including the main logo, navigation links, and mobile menu trigger.

## Usage

To use the header component in a page:

1. Add the following placeholder comment where you want the header to appear:

```html
<!-- HEADER -->
```

2. The build script will automatically:
   - Replace this placeholder with the header component HTML
   - Include the header component's CSS in the combined stylesheet

## Customization

To modify the header:

- Edit `header.html` for markup changes
- Edit `header.css` for styling changes

## Active States

To mark the current page in the navigation, ensure the appropriate link has the `active` class:

```html
<li><a href="/" class="active">Home</a></li>
```

For other pages, you'll need to modify this in the component.
