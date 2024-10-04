document.addEventListener("DOMContentLoaded", function () {
    const authorFilter = document.getElementById("filter-author");
    const categoryFilter = document.getElementById("filter-category");
    const tagFilter = document.getElementById("filter-tag");
    const searchInput = document.getElementById("search-input");
    const postItems = document.querySelectorAll(".post-item");

    authorFilter.addEventListener("change", filterPosts);
    categoryFilter.addEventListener("change", filterPosts);
    tagFilter.addEventListener("change", filterPosts);
    searchInput.addEventListener("input", filterPosts);

    function filterPosts() {
        const selectedAuthor = authorFilter.value;
        const selectedCategory = categoryFilter.value;
        const selectedTag = tagFilter.value;
        const searchQuery = searchInput.value.toLowerCase();

        postItems.forEach(post => {
            const postAuthor = post.getAttribute("data-author");
            const postCategories = post.getAttribute("data-categories").split(",");
            const postTags = post.getAttribute("data-tags").split(",");
            const postTitle = post.getAttribute("data-title");
            const postContent = post.getAttribute("data-content");

            let isVisible = true;

            if (selectedAuthor && postAuthor !== selectedAuthor) isVisible = false;
            if (selectedCategory && !postCategories.includes(selectedCategory)) isVisible = false;
            if (selectedTag && !postTags.includes(selectedTag)) isVisible = false;
            if (searchQuery && !postTitle.includes(searchQuery) && !postContent.includes(searchQuery)) isVisible = false;

            post.style.display = isVisible ? "block" : "none";
        });
    }
});

