const fs = require('fs');
const path = require('path');
const marked = require('marked');
const fm = require('front-matter');

// Paths
const postsDir = './blog/posts/';
const outputDir = './blog/public/';
const templateDir = './blog/templates/';

// Templates
const postTemplate = fs.readFileSync(path.join(templateDir, 'post-template.html'), 'utf8');
const indexTemplate = fs.readFileSync(path.join(templateDir, 'index-template.html'), 'utf8');

// Store blog metadata for the index
let blogIndex = [];
let authors = new Set();
let categories = new Set();
let tags = new Set();

// Build the blog
fs.readdir(postsDir, (err, files) => {
    if (err) throw err;

    files.forEach(file => {
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

        const filledTemplate = postTemplate
            .replace('{{ title }}', data.title)
            .replace('{{ author }}', data.author)
            .replace('{{ date }}', data.date)
            .replace('{{ categories }}', data.categories.join(', '))
            .replace('{{ tags }}', data.tags.join(', '))
            .replace('{{ content }}', data.content);

        const outputFileName = file.replace('.md', '.html');
        fs.writeFileSync(path.join(outputDir, outputFileName), filledTemplate);

        blogIndex.push({
            title: data.title,
            author: data.author,
            fileName: outputFileName,
            date: data.date,
            categories: data.categories,
            tags: data.tags,
        });

        authors.add(data.author);
        data.categories.forEach(cat => categories.add(cat));
        data.tags.forEach(tag => tags.add(tag));
    });

    generateIndexPage();
});

// Generate the index page
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

    const filledIndexTemplate = indexTemplate
        .replace('{{ postList }}', postListHtml)
        .replace('{{ authorOptions }}', authorOptions)
        .replace('{{ categoryOptions }}', categoryOptions)
        .replace('{{ tagOptions }}', tagOptions);

    fs.writeFileSync(path.join(outputDir, 'index.html'), filledIndexTemplate);
}
