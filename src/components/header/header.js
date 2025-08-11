/**
 * Header Component – mobile menu, active link, a11y niceties
 */
class HeaderComponent {
  constructor() {
    this.hamburger = document.querySelector(".hamburger");
    this.mobileMenu = document.getElementById("mobile-menu");
    this.body = document.body;
    this.firstFocusable = null;
    this.prevFocus = null;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setActiveNavLink();
  }

  setupEventListeners() {
    if (this.hamburger) {
      this.hamburger.addEventListener("click", () => this.toggleMobileMenu());
    }

    // Close when clicking outside the menu
    document.addEventListener("click", (e) => this.handleOutsideClick(e));

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.mobileMenu.classList.contains("open")) {
        this.toggleMobileMenu(false);
        this.hamburger.focus();
      }
    });

    // Auto-close if resizing to desktop to prevent stuck overlay
    window.addEventListener("resize", () => {
      if (
        window.innerWidth >= 769 &&
        this.mobileMenu.classList.contains("open")
      ) {
        this.toggleMobileMenu(false);
      }
    });
  }

  toggleMobileMenu(force) {
    const open =
      typeof force === "boolean"
        ? force
        : !this.mobileMenu.classList.contains("open");
    this.mobileMenu.classList.toggle("open", open);
    this.hamburger.classList.toggle("active", open);
    this.body.classList.toggle("no-scroll", open);

    // a11y state
    this.hamburger.setAttribute("aria-expanded", String(open));
    this.mobileMenu.setAttribute("aria-hidden", String(!open));

    if (open) {
      // focus management: remember, then move into menu
      this.prevFocus = document.activeElement;
      const focusables = this.mobileMenu.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      this.firstFocusable = focusables[0] || null;
      if (this.firstFocusable) this.firstFocusable.focus();
    } else if (this.prevFocus) {
      // restore focus to the toggle
      this.hamburger.focus();
      this.prevFocus = null;
      this.firstFocusable = null;
    }
  }

  handleOutsideClick(e) {
    if (
      this.mobileMenu &&
      this.hamburger &&
      !this.mobileMenu.contains(e.target) &&
      !this.hamburger.contains(e.target) &&
      this.mobileMenu.classList.contains("open")
    ) {
      this.toggleMobileMenu(false);
      this.hamburger.focus();
    }
  }

  setActiveNavLink() {
    const currentPath = window.location.pathname;
    const updateActiveLinks = (selector) => {
      const navLinks = document.querySelectorAll(selector);
      navLinks.forEach((link) => {
        const linkPath = link.getAttribute("href");
        link.classList.toggle(
          "active",
          this.shouldLinkBeActive(currentPath, linkPath)
        );
      });
    };
    updateActiveLinks(".nav-links a");
    updateActiveLinks(".mobile-nav-links a");
  }

  shouldLinkBeActive(currentPath, linkPath) {
    // Home
    if (
      linkPath === "/" &&
      (currentPath === "/" || currentPath === "/index.html")
    ) {
      return true;
    }
    // Handle /blog/index.html
    if (linkPath.endsWith("index.html")) {
      const base = linkPath.slice(0, -"index.html".length);
      return (
        currentPath === linkPath ||
        currentPath === base ||
        currentPath.startsWith(base)
      );
    }
    // Handle *.html links
    return (
      currentPath === linkPath ||
      (currentPath.endsWith(".html") &&
        currentPath.replace(".html", "") === linkPath)
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new HeaderComponent();
});

// Export for tests if needed
if (typeof module !== "undefined" && module.exports) {
  module.exports = HeaderComponent;
}
