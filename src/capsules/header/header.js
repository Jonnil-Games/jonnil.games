(function () {
    const root = document.querySelector("header");
    if (!root) return;
    const currentPath = window.location.pathname;
    function normalizePath(path) {
        if (!path) return "";
        let next = path;
        if (next.endsWith("index.html")) {
            next = next.slice(0, -"index.html".length);
        }
        if (next.endsWith(".html")) {
            next = next.slice(0, -".html".length);
        }
        if (!next.startsWith("/")) {
            next = `/${next}`;
        }
        if (next.length > 1 && next.endsWith("/")) {
            next = next.slice(0, -1);
        }
        return next;
    }
    function shouldBeActive(linkPath) {
        if (
            linkPath === "/" &&
            (currentPath === "/" || currentPath === "/index.html")
        )
            return true;
        const linkBase = normalizePath(linkPath);
        const currentBase = normalizePath(currentPath);
        if (!linkBase || linkBase === "/") return false;
        if (
            linkBase === "/games" &&
            (currentBase === "/games" || currentBase.startsWith("/games/"))
        ) {
            return true;
        }
        return (
            currentBase === linkBase ||
            currentBase.startsWith(`${linkBase}/`)
        );
    }
    const desktopLinks = root.querySelectorAll(".nav-links a");
    desktopLinks.forEach((a) =>
        a.classList.toggle("active", shouldBeActive(a.getAttribute("href") || ""))
    );

    const mobileLinks = root.querySelectorAll(".mobile-nav-links a");
    mobileLinks.forEach((a) =>
        a.classList.toggle("active", shouldBeActive(a.getAttribute("href") || ""))
    );

    const hamburger = root.querySelector(".hamburger");
    const mobileMenu = root.querySelector("#mobile-menu");
    const body = document.body;

    // Ensure year is current in mobile footer
    const yearEl = root.querySelector("#current-year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    if (hamburger && mobileMenu) {
        function openMenu() {
            mobileMenu.classList.add("open");
            hamburger.classList.add("active");
            hamburger.setAttribute("aria-expanded", "true");
            mobileMenu.setAttribute("aria-hidden", "false");
            body.classList.add("no-scroll");
            // Focus first link for accessibility
            const firstLink = mobileMenu.querySelector("a");
            if (firstLink) firstLink.focus();
        }

        function closeMenu() {
            mobileMenu.classList.remove("open");
            hamburger.classList.remove("active");
            hamburger.setAttribute("aria-expanded", "false");
            mobileMenu.setAttribute("aria-hidden", "true");
            body.classList.remove("no-scroll");
            hamburger.focus();
        }

        function toggleMenu() {
            if (mobileMenu.classList.contains("open")) {
                closeMenu();
            } else {
                openMenu();
            }
        }

        hamburger.addEventListener("click", toggleMenu);

        // Close when a mobile nav link is clicked
        mobileLinks.forEach((a) =>
            a.addEventListener("click", () => {
                closeMenu();
            })
        );

        // Close on Escape key
        window.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && mobileMenu.classList.contains("open")) {
                closeMenu();
            }
        });

        // Close the menu if transitioning to desktop
        window.addEventListener("resize", () => {
            if (window.innerWidth >= 769 && mobileMenu.classList.contains("open")) {
                closeMenu();
            }
        });
    }

    const navbar = root.querySelector(".navbar");
    const navLinks = root.querySelector(".nav-links");
    const navActions = root.querySelector(".nav-actions");
    const logo = root.querySelector(".logo");
    const MIN_GAP = 16;

    function updateNavLayout() {
        if (!navbar || !navLinks || !logo) return;
        if (getComputedStyle(navLinks).display === "none") return;

        navbar.classList.remove("nav-between");

        const navRect = navLinks.getBoundingClientRect();
        const logoRect = logo.getBoundingClientRect();
        const actionsEl = navActions || hamburger;
        const actionsRect = actionsEl ? actionsEl.getBoundingClientRect() : null;

        let overlaps = navRect.left < logoRect.right + MIN_GAP;
        if (actionsRect) {
            overlaps = overlaps || navRect.right > actionsRect.left - MIN_GAP;
        }

        if (overlaps) {
            navbar.classList.add("nav-between");
        }
    }

    window.addEventListener("resize", updateNavLayout);
    document.addEventListener("jg-i18n-ready", updateNavLayout);
    if (document.fonts && typeof document.fonts.ready?.then === "function") {
        document.fonts.ready.then(updateNavLayout);
    }
    requestAnimationFrame(updateNavLayout);
})();
