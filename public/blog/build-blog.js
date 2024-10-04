const fs = require('fs');
const path = require('path');
const fm = require('front-matter');
const marked = require('marked').marked;

// Use relative paths based on the current structure
const postsDir = path.join('public/blog/posts/');
const outputDir = path.join('public/blog/');
const templateDir = path.join('public/blog/templates/');

console.log("Starting the blog build process...");

// Ensure the public/blog directory exists
if (!fs.existsSync(outputDir)) {
    console.log(`Creating directory: ${outputDir}`);
    fs.mkdirSync(outputDir, { recursive: true });
}

// Templates
console.log("Loading templates...");
const postTemplate = fs.readFileSync(path.join(templateDir, 'post-template.html'), 'utf8');
const indexTemplate = fs.readFileSync(path.join(templateDir, 'index-template.html'), 'utf8');

// Store blog metadata for the index
let blogIndex = [];
let authors = new Set();
let categories = new Set();
let tags = new Set();

// Build the blog
console.log("Reading blog posts...");
fs.readdir(postsDir, (err, files) => {
    if (err) {
        console.error("Error reading posts directory:", err);
        process.exit(1);
    }

    files.forEach(file => {
        try {
            console.log(`Processing post: ${file}`);
            const filePath = path.join(postsDir, file);
            const markdown = fs.readFileSync(filePath, 'utf8');
            const { attributes, body } = fm(markdown);
            const htmlContent = marked(body);

            const data = {
                title: attributes.title,
                author: attributes.author,
                date: attributes.date,
                categories: attributes.categories || [],
                tags: attributes.tags || [],
                content: htmlContent,
            };

            // Fill in the post template with data from the markdown file
            const filledTemplate = postTemplate
                .replace('{{ title }}', data.title)
                .replace('{{ author }}', data.author)
                .replace('{{ date }}', data.date)
                .replace('{{ categories }}', data.categories.join(', '))
                .replace('{{ tags }}', data.tags.join(', '))
                .replace('{{ content }}', data.content);

            // Output filename for each blog post
            const outputFileName = file.replace('.md', '.html');
            console.log(`Writing post to: ${path.join(outputDir, outputFileName)}`);
            fs.writeFileSync(path.join(outputDir, outputFileName), filledTemplate);

            // Collect metadata for the blog index
            blogIndex.push({
                title: data.title,
                author: data.author,
                fileName: outputFileName,
                date: data.date,
                categories: data.categories,
                tags: data.tags,
            });

            // Add author, categories, and tags for filtering
            authors.add(data.author);
            data.categories.forEach(cat => categories.add(cat));
            data.tags.forEach(tag => tags.add(tag));
        } catch (postError) {
            console.error(`Error processing post ${file}:`, postError);
        }
    });

    console.log("Generating blog index...");
    generateIndexPage();
});

// Generate the index page for the blog
function generateIndexPage() {
    let postListHtml = '';
    blogIndex.forEach(post => {
        postListHtml += `
            <li class="post-item" data-author="${post.author}" data-categories="${post.categories.join(',')}" data-tags="${post.tags.join(',')}" data-title="${post.title.toLowerCase()}">
                <a href="${post.fileName}">${post.title}</a> by ${post.author} on ${post.date}
                <br>Categories: ${post.categories.join(', ')}<br>Tags: ${post.tags.join(', ')}
            </li>
        `;
    });

    const authorOptions = Array.from(authors).map(author => `<option value="${author}">${author}</option>`).join('');
    const categoryOptions = Array.from(categories).map(cat => `<option value="${cat}">${cat}</option>`).join('');
    const tagOptions = Array.from(tags).map(tag => `<option value="${tag}">${tag}</option>`).join('');

    // Fill in the index template with the post list and filter options
    const filledIndexTemplate = indexTemplate
        .replace('{{ postList }}', postListHtml)
        .replace('{{ authorOptions }}', authorOptions)
        .replace('{{ categoryOptions }}', categoryOptions)
        .replace('{{ tagOptions }}', tagOptions);

    console.log(`Writing blog index to: ${path.join(outputDir, 'index.html')}`);
    fs.writeFileSync(path.join(outputDir, 'index.html'), filledIndexTemplate);

    console.log("Blog build process completed successfully.");
}
