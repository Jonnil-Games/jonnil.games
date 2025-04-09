/**
 * Header Component JavaScript
 *
 * This file contains functionality for:
 * - Mobile menu toggle
 * - Outside click detection for closing mobile menu
 * - Setting active navigation link based on current page
 * - Accessibility enhancements
 */

class HeaderComponent {
  constructor() {
    this.hamburger = document.querySelector(".hamburger");
    this.mobileMenu = document.querySelector(".mobile-menu");
    this.body = document.body;

    // Initialize
    this.init();
  }

  init() {
    // Set up event listeners
    this.setupEventListeners();

    // Set active navigation link based on current path
    this.setActiveNavLink();
  }

  setupEventListeners() {
    // Toggle mobile menu when hamburger is clicked
    if (this.hamburger) {
      this.hamburger.addEventListener("click", () => this.toggleMobileMenu());
    }

    // Close mobile menu when clicking outside
    document.addEventListener("click", (e) => this.handleOutsideClick(e));
  }

  toggleMobileMenu() {
    const isOpen = this.mobileMenu.classList.toggle("open");
    this.hamburger.classList.toggle("active", isOpen);
    this.body.classList.toggle("no-scroll", isOpen);

    // Update ARIA attributes for accessibility
    this.hamburger.setAttribute("aria-expanded", isOpen);
    this.mobileMenu.setAttribute("aria-hidden", !isOpen);
  }

  handleOutsideClick(e) {
    // Close menu when clicking outside (but not on the hamburger itself)
    if (
      this.mobileMenu &&
      this.hamburger &&
      !this.mobileMenu.contains(e.target) &&
      !this.hamburger.contains(e.target) &&
      this.mobileMenu.classList.contains("open")
    ) {
      this.toggleMobileMenu();
    }
  }

  setActiveNavLink() {
    // Get current path
    const currentPath = window.location.pathname;

    // Function to update active links in both desktop and mobile menus
    const updateActiveLinks = (selector) => {
      const navLinks = document.querySelectorAll(selector);

      navLinks.forEach((link) => {
        const linkPath = link.getAttribute("href");

        // Remove any existing active classes
        link.classList.remove("active");

        // Set active class based on current path
        if (this.shouldLinkBeActive(currentPath, linkPath)) {
          link.classList.add("active");
        }
      });
    };

    // Update both navigation menus
    updateActiveLinks(".nav-links a");
    updateActiveLinks(".mobile-nav-links a");
  }

  shouldLinkBeActive(currentPath, linkPath) {
    // Homepage match
    if (
      linkPath === "/" &&
      (currentPath === "/" || currentPath === "/index.html")
    ) {
      return true;
    }

    // Other pages - check if currentPath starts with linkPath
    // But avoid matching partial paths (e.g. /team shouldn't match /teammates)
    if (linkPath !== "/") {
      // Handle index.html links
      if (linkPath.endsWith("index.html")) {
        const basePath = linkPath.replace("index.html", "");
        return (
          currentPath.startsWith(basePath) &&
          (currentPath === linkPath ||
            (currentPath.startsWith(basePath) &&
              !currentPath.replace(basePath, "").includes("/")))
        );
      }

      // Handle regular page links
      return (
        currentPath === linkPath ||
        (currentPath.endsWith(".html") &&
          currentPath.replace(".html", "") === linkPath)
      );
    }

    return false;
  }
}

// Initialize the header component when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new HeaderComponent();
});

// Export for module usage if needed
if (typeof module !== "undefined" && module.exports) {
  module.exports = HeaderComponent;
}
