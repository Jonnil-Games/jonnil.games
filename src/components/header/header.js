/**
 * Header Component – mobile menu, active link, a11y niceties
 */
class HeaderComponent {
  constructor() {
    this.hamburger = null;
    this.mobileMenu = null;
    this.body = document.body;
    this.firstFocusable = null;
    this.prevFocus = null;
    this.listenersAttached = false;
    this.isObserving = false;

    this.init();
  }

  init() {
    this.cacheElements();
    if (this.hamburger && this.mobileMenu) {
      this.setupEventListeners();
      this.setActiveNavLink();
    } else {
      this.observeForHeaderLoad();
    }
  }

  cacheElements() {
    this.hamburger = document.querySelector(".hamburger");
    this.mobileMenu = document.getElementById("mobile-menu");
  }

  observeForHeaderLoad() {
    if (this.isObserving) return;
    this.isObserving = true;

    const targetNode =
      document.getElementById("header-container") || document.body;
    const observer = new MutationObserver(() => {
      this.cacheElements();
      if (this.hamburger && this.mobileMenu && !this.listenersAttached) {
        observer.disconnect();
        this.setupEventListeners();
        this.setActiveNavLink();
        this.isObserving = false;
      }
    });

    observer.observe(targetNode, { childList: true, subtree: true });
  }

  setupEventListeners() {
    if (this.listenersAttached) return;

    // Delegated click handling ensures robustness even if elements are injected later
    document.addEventListener("click", (e) => {
      // Toggle when tapping the hamburger button
      const hamburgerButton = e.target.closest(".hamburger");
      if (hamburgerButton) {
        this.cacheElements();
        this.toggleMobileMenu();
        return;
      }

      // Close when selecting a link inside the mobile menu
      const menuLink = e.target.closest("#mobile-menu .mobile-nav-links a");
      if (menuLink && this.mobileMenu?.classList.contains("open")) {
        this.toggleMobileMenu(false);
        return;
      }
    });

    // Close when clicking outside the menu
    document.addEventListener("click", (e) => this.handleOutsideClick(e));

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        this.mobileMenu &&
        this.mobileMenu.classList.contains("open")
      ) {
        this.toggleMobileMenu(false);
        if (this.hamburger) this.hamburger.focus();
      }
    });

    // Auto-close if resizing to desktop to prevent stuck overlay
    window.addEventListener("resize", () => {
      if (
        window.innerWidth >= 769 &&
        this.mobileMenu &&
        this.mobileMenu.classList.contains("open")
      ) {
        this.toggleMobileMenu(false);
      }
    });

    // Close menu when a mobile nav link is clicked
    const mobileLinks = document.querySelectorAll(".mobile-nav-links a");
    if (mobileLinks && mobileLinks.length) {
      mobileLinks.forEach((link) =>
        link.addEventListener("click", () => this.toggleMobileMenu(false))
      );
    }

    this.listenersAttached = true;
  }

  toggleMobileMenu(force) {
    // Ensure elements are available (header may have loaded after init)
    if (!this.hamburger || !this.mobileMenu) {
      this.cacheElements();
      if (!this.hamburger || !this.mobileMenu) return; // Still not ready
    }
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
      if (this.hamburger) this.hamburger.focus();
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new HeaderComponent();
  });
} else {
  new HeaderComponent();
}

// Export for tests if needed
if (typeof module !== "undefined" && module.exports) {
  module.exports = HeaderComponent;
}
