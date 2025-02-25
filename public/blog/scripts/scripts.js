document.addEventListener("DOMContentLoaded", function () {
    const authorFilter = document.getElementById("author-filter");
    const categoryFilter = document.getElementById("category-filter");
    const tagFilter = document.getElementById("tag-filter");
    const searchInput = document.querySelector(".search-box");
    const postCards = document.querySelectorAll(".post-card");

    [authorFilter, categoryFilter, tagFilter].forEach(filter => {
        if (filter) filter.addEventListener("change", filterPosts);
    });

    if (searchInput) searchInput.addEventListener("input", filterPosts);

    function filterPosts() {
        const selectedAuthor = authorFilter?.value || "";
        const selectedCategory = categoryFilter?.value || "";
        const selectedTag = tagFilter?.value || "";
        const searchQuery = searchInput?.value.toLowerCase() || "";

        postCards.forEach(post => {
            const postAuthor = post.querySelector(".post-meta")?.textContent || "";
            const postCategories = Array.from(post.querySelectorAll(".post-meta p"))
                .find(p => p.textContent.startsWith("Categories:"))
                ?.textContent.split(":")[1].split(",").map(c => c.trim()) || [];
            const postTags = Array.from(post.querySelectorAll(".post-meta p"))
                .find(p => p.textContent.startsWith("Tags:"))
                ?.textContent.split(":")[1].split(",").map(t => t.trim()) || [];
            const postTitle = post.querySelector(".post-title")?.textContent.toLowerCase() || "";

            const matchesAuthor = !selectedAuthor || postAuthor.includes(selectedAuthor);
            const matchesCategory = !selectedCategory || postCategories.includes(selectedCategory);
            const matchesTag = !selectedTag || postTags.includes(selectedTag);
            const matchesSearch = !searchQuery ||
                postTitle.includes(searchQuery) ||
                postAuthor.toLowerCase().includes(searchQuery);

            post.style.display = (matchesAuthor && matchesCategory && matchesTag && matchesSearch) ? "block" : "none";
        });
    }

    // Mobile menu functionality
    const hamburger = document.querySelector(".hamburger");
    const mobileMenu = document.querySelector(".mobile-menu");
    const body = document.body;

    hamburger.addEventListener("click", () => {
        const isOpen = mobileMenu.classList.toggle("open");
        hamburger.classList.toggle("active");
        body.classList.toggle("no-scroll", isOpen);
        hamburger.setAttribute("aria-expanded", isOpen);
        mobileMenu.setAttribute("aria-hidden", !isOpen);
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
        if (
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

