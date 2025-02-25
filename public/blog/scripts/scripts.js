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
});

