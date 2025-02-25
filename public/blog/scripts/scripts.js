document.addEventListener("DOMContentLoaded", function () {
    // Blog filtering functionality
    const blogSearch = document.getElementById("blog-search");
    const authorFilter = document.getElementById("author-filter");
    const categoryFilter = document.getElementById("category-filter");
    const tagFilter = document.getElementById("tag-filter");
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

    function filterPosts() {
        const searchQuery = blogSearch?.value.toLowerCase().trim() || "";
        const selectedAuthor = authorFilter?.value || "";
        const selectedCategory = categoryFilter?.value || "";
        const selectedTag = tagFilter?.value || "";

        posts.forEach(post => {
            // Get post data
            const postTitle = post.querySelector("h2")?.textContent.toLowerCase() || "";
            const postAuthor = post.querySelector(".post-author")?.textContent.toLowerCase() || "";
            const postCategory = post.querySelector(".post-category")?.textContent.toLowerCase() || "";
            const postTags = Array.from(post.querySelectorAll(".tag")).map(tag => tag.textContent.toLowerCase());

            // Check if post matches all filters
            const matchesSearch = !searchQuery ||
                postTitle.includes(searchQuery) ||
                postAuthor.includes(searchQuery) ||
                postCategory.includes(searchQuery) ||
                postTags.some(tag => tag.includes(searchQuery));

            const matchesAuthor = !selectedAuthor || postAuthor.includes(selectedAuthor.toLowerCase());
            const matchesCategory = !selectedCategory || postCategory === selectedCategory.toLowerCase();
            const matchesTag = !selectedTag || postTags.includes(selectedTag.toLowerCase());

            // Apply fade transition
            if (matchesSearch && matchesAuthor && matchesCategory && matchesTag) {
                post.style.display = "flex";
                setTimeout(() => post.style.opacity = "1", 10);
            } else {
                post.style.opacity = "0";
                setTimeout(() => post.style.display = "none", 300);
            }
        });
    }

    // Add event listeners with debounce
    const debouncedFilter = debounce(filterPosts, 300);

    blogSearch?.addEventListener("input", debouncedFilter);
    authorFilter?.addEventListener("change", filterPosts);
    categoryFilter?.addEventListener("change", filterPosts);
    tagFilter?.addEventListener("change", filterPosts);

    // Initialize all posts with opacity transition
    posts.forEach(post => {
        post.style.transition = "opacity 0.3s ease-in-out";
        post.style.opacity = "1";
    });

    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", function (e) {
            e.preventDefault();
            const targetId = this.getAttribute("href");
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

    // Mobile menu functionality
    const hamburger = document.querySelector(".hamburger");
    const mobileMenu = document.querySelector(".mobile-menu");
    const body = document.body;

    hamburger?.addEventListener("click", () => {
        const isOpen = mobileMenu.classList.toggle("open");
        hamburger.classList.toggle("active");
        body.classList.toggle("no-scroll", isOpen);
        hamburger.setAttribute("aria-expanded", isOpen);
        mobileMenu.setAttribute("aria-hidden", !isOpen);
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
        if (mobileMenu &&
            !mobileMenu.contains(e.target) &&
            !hamburger.contains(e.target) &&
            mobileMenu.classList.contains("open")
        ) {
            mobileMenu.classList.remove("open");
            hamburger.classList.remove("active");
            body.classList.remove("no-scroll");
            hamburger.setAttribute("aria-expanded", "false");
            mobileMenu.setAttribute("aria-hidden", "true");
        }
    });
});

