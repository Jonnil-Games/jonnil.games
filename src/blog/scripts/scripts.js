document.addEventListener("DOMContentLoaded", function () {
  function formatDates() {
    const locale = window.JG_I18N ? window.JG_I18N.getState().locale : undefined;
    document.querySelectorAll("time[datetime]").forEach((el) => {
      const raw = el.getAttribute("datetime");
      if (!raw) return;
      const date = new Date(`${raw}T12:00:00Z`);
      if (Number.isNaN(date.getTime())) return;
      el.textContent = date.toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    });
  }

  // Blog filtering functionality
  const blogSearch = document.getElementById("blog-search");
  const authorFilter = document.getElementById("author-filter");
  const categoryFilter = document.getElementById("category-filter");
  const posts = document.querySelectorAll(".post-card");

  let debounceTimeout;

  function debounce(func, wait) {
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(debounceTimeout);
        func(...args);
      };
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(later, wait);
    };
  }

  function normalizeValue(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  function getVisibleLocalizedText(container, selector) {
    const target = container.querySelector(selector);
    if (!target) return "";
    const localized = target.querySelector?.("[data-blog-lang]:not([hidden])");
    const content = localized || target;
    return normalizeValue(content.textContent);
  }

  function filterPosts() {
    const searchQuery = normalizeValue(blogSearch?.value || "");
    const selectedAuthor = normalizeValue(authorFilter?.value || "");
    const selectedCategory = normalizeValue(categoryFilter?.value || "");

    posts.forEach((post) => {
      const postTitle = getVisibleLocalizedText(post, "h2");
      const postAuthorText = getVisibleLocalizedText(post, ".post-author");
      const postExcerpt = getVisibleLocalizedText(post, "p[data-blog-l10n-group]");
      const postCategoryText = getVisibleLocalizedText(post, ".post-category");
      const postAuthorKey = normalizeValue(post.dataset.authorKey);
      const postCategoryKey = normalizeValue(post.dataset.categoryKey);

      const matchesSearch =
        !searchQuery ||
        postTitle.includes(searchQuery) ||
        postAuthorText.includes(searchQuery) ||
        postCategoryText.includes(searchQuery) ||
        postExcerpt.includes(searchQuery);

      const matchesAuthor = !selectedAuthor || postAuthorKey === selectedAuthor;
      const matchesCategory =
        !selectedCategory || postCategoryKey === selectedCategory;

      // Use CSS classes for transitions instead of inline styles
      if (matchesSearch && matchesAuthor && matchesCategory) {
        post.classList.remove("hidden");
        requestAnimationFrame(() => post.classList.remove("fade-out"));
      } else {
        post.classList.add("fade-out");
        const onFade = (event) => {
          if (event.propertyName !== "opacity") return;
          if (post.classList.contains("fade-out")) {
            post.classList.add("hidden");
          }
        };
        post.addEventListener("transitionend", onFade, { once: true });
      }
    });
  }

  // Add event listeners with debounce
  const debouncedFilter = debounce(filterPosts, 300);

  blogSearch?.addEventListener("input", debouncedFilter);
  authorFilter?.addEventListener("change", filterPosts);
  categoryFilter?.addEventListener("change", filterPosts);

  // Initialize all posts with proper visibility
  posts.forEach((post) => {
    post.classList.remove("hidden", "fade-out");
  });
  filterPosts();

  // Add smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href");
      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        const headerOffset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition =
          elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
    });
  });

  // Header/mobile menu behavior is provided by the header capsule inline script

  formatDates();
  document.addEventListener("jg-i18n-ready", () => {
    formatDates();
    filterPosts();
  });
});
