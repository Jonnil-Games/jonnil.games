const fs = require("fs");
const path = require("path");
const fm = require("front-matter");
const marked = require("marked").marked;
const Handlebars = require("handlebars");

// Register Handlebars helpers
Handlebars.registerHelper("formatDate", function (date) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  const utcDate = new Date(date + "T12:00:00Z"); // Use noon UTC to avoid timezone issues
  return utcDate.toLocaleDateString("en-US", options);
});

// Add a helper for URL generation
Handlebars.registerHelper("blogUrl", function (fileName) {
  return `/blog/${fileName}`;
});

// Use relative paths based on the current structure
const postsDir = path.join("public/blog/posts/");
const outputDir = path.join("public/blog/");
const templateDir = path.join("public/blog/templates/");

console.log("Starting the blog build process...");

// Ensure the public/blog directory exists
if (!fs.existsSync(outputDir)) {
  console.log(`Creating directory: ${outputDir}`);
  fs.mkdirSync(outputDir, { recursive: true });
}

// Templates
console.log("Loading and compiling templates...");
const postTemplateSource = fs.readFileSync(
  path.join(templateDir, "post-template.html"),
  "utf8"
);
const indexTemplateSource = fs.readFileSync(
  path.join(templateDir, "index-template.html"),
  "utf8"
);

// Compile templates
const postTemplate = Handlebars.compile(postTemplateSource);
const indexTemplate = Handlebars.compile(indexTemplateSource);

// Store blog metadata for the index
let blogIndex = [];
let authors = new Set();
let categories = new Set();

// Build the blog
console.log("Reading blog posts...");
fs.readdir(postsDir, (err, files) => {
  if (err) {
    console.error("Error reading posts directory:", err);
    process.exit(1);
  }

  // Filter for markdown files and sort by date
  const markdownFiles = files.filter((file) => file.endsWith(".md"));

  markdownFiles.forEach((file) => {
    try {
      console.log(`Processing post: ${file}`);
      const filePath = path.join(postsDir, file);
      const markdown = fs.readFileSync(filePath, "utf8");
      const { attributes, body } = fm(markdown);
      const htmlContent = marked(body);

      // Generate excerpt from content
      const excerpt =
        body
          .replace(/[#*`]/g, "")
          .split("\n")
          .filter((line) => line.trim())
          .slice(0, 2)
          .join(" ")
          .substring(0, 150) + "...";

      const outputFileName = file.replace(".md", ".html");
      const data = {
        title: attributes.title,
        author: attributes.author,
        date: attributes.date,
        categories: attributes.categories || [],
        content: htmlContent,
        excerpt: attributes.excerpt || excerpt,
        url: `/blog/${outputFileName}`,
      };

      // Add metadata to sets for filtering
      authors.add(data.author);
      data.categories.forEach((cat) => categories.add(cat));

      // Generate HTML using Handlebars template
      const filledTemplate = postTemplate(data);

      // Output filename for each blog post
      const outputPath = path.join(outputDir, outputFileName);
      fs.writeFileSync(outputPath, filledTemplate);

      // Store post metadata for the index
      blogIndex.push(data);
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  });

  // Sort posts by date before generating index
  blogIndex.sort((a, b) => new Date(b.date) - new Date(a.date));

  generateIndexPage();
});

// Generate the index page for the blog
function generateIndexPage() {
  const indexData = {
    posts: blogIndex,
    authors: Array.from(authors).sort(),
    categories: Array.from(categories).sort(),
  };

  // Generate HTML using Handlebars template
  const filledIndexTemplate = indexTemplate(indexData);
  fs.writeFileSync(path.join(outputDir, "index.html"), filledIndexTemplate);

  // Generate a JSON file with recent posts for the home page
  const recentPosts = blogIndex.slice(0, 3).map((post) => ({
    title: post.title,
    date: post.date,
    category: post.categories[0] || "",
    excerpt: post.excerpt,
    author: post.author,
    url: post.url,
  }));

  fs.writeFileSync(
    path.join(outputDir, "recent-posts.json"),
    JSON.stringify(recentPosts, null, 2)
  );

  console.log("Blog build completed successfully!");
}
