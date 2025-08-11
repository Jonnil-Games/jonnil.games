const fs = require("fs");
const path = require("path");
const fm = require("front-matter");
const marked = require("marked").marked;
const Handlebars = require("handlebars");

// -----------------------------
// Quiet mode & Markdown config
// -----------------------------
const QUIET =
  process.argv.includes("--quiet") ||
  process.env.BUILD_QUIET === "1" ||
  process.env.BLOG_QUIET === "1";
if (QUIET) {
  // Keep warnings/errors; silence standard logs
  // eslint-disable-next-line no-console
  console.log = () => {};
}
marked.setOptions({
  gfm: true,
  breaks: false,
  headerIds: true,
  mangle: false,
});

// -----------------------------
// Handlebars helpers (shared)
// -----------------------------
Handlebars.registerHelper("formatDate", function (date) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  const utcDate = new Date(date + "T12:00:00Z"); // noon UTC avoids tz drift
  return utcDate.toLocaleDateString("en-US", options);
});
Handlebars.registerHelper("blogUrl", function (fileName) {
  return `/blog/${fileName}`;
});
Handlebars.registerHelper("slug", function (str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
});
Handlebars.registerHelper("truncate", function (str, len) {
  const s = String(str || "");
  if (s.length <= len) return s;
  return s.slice(0, len - 1) + "…";
});

// -----------------------------
// Paths
// -----------------------------
const rootDir = __dirname;
const srcDir = path.join(rootDir, "src");
const publicDir = path.join(rootDir, "public");
const componentsDir = path.join(srcDir, "components");
const stylesDir = path.join(srcDir, "styles");
const pagesDir = path.join(srcDir, "pages");
const assetsDir = path.join(srcDir, "assets");

// Blog-specific paths
const blogDir = path.join(srcDir, "blog");
const postsDir = path.join(blogDir, "posts");
const templateDir = path.join(blogDir, "templates");
const blogOutputDir = path.join(publicDir, "blog");
const blogStylesFile = path.join(blogDir, "styles.css");
const blogScriptsDir = path.join(blogDir, "scripts");

// -----------------------------
// FS helpers
// -----------------------------
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}
function fileExists(filePath) {
  return fs.existsSync(filePath);
}
function readFile(filePath) {
  try {
    if (fileExists(filePath)) {
      return fs.readFileSync(filePath, "utf-8");
    }
    console.warn(`Warning: File not found: ${filePath}`);
    return "";
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return "";
  }
}
function writeFile(filePath, content) {
  try {
    ensureDirectoryExists(path.dirname(filePath));
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`File written: ${filePath}`);
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
  }
}
function cleanDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  fs.mkdirSync(dirPath, { recursive: true });
}
function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDirectoryExists(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// -----------------------------
// Site: component injection & styles
// -----------------------------
function injectComponents(pagePath) {
  console.log(`Injecting components into: ${pagePath}`);
  if (!fileExists(pagePath)) {
    console.error(`Page not found: ${pagePath}`);
    return null;
  }
  let pageContent = readFile(pagePath);
  pageContent = pageContent.replace(
    /<cyan\s+component="([^"]+)"[^>]*><\/cyan>/g,
    (_full, componentName) => {
      const componentPath = path.join(
        componentsDir,
        componentName,
        `${componentName}.html`
      );
      if (!fileExists(componentPath)) {
        console.error(`Component not found: ${componentPath}`);
        return `<!-- missing component: ${componentName} -->`;
      }
      const componentHtml = readFile(componentPath);

      // Ensure component JS is included once
      const jsPath = path.join(
        componentsDir,
        componentName,
        `${componentName}.js`
      );
      const publicJsRef = `/components/${componentName}/${componentName}.js`;
      if (fileExists(jsPath) && !pageContent.includes(publicJsRef)) {
        const scriptTag = `<script src="${publicJsRef}"></script>`;
        const bodyCloseRe = /<\/body>/i;
        pageContent = bodyCloseRe.test(pageContent)
          ? pageContent.replace(bodyCloseRe, `${scriptTag}\n</body>`)
          : `${pageContent}\n${scriptTag}`;
        console.log(`Added ${componentName}.js script to the page`);
      }

      return componentHtml;
    }
  );
  return pageContent;
}
function getCSSVariables() {
  const variablesPath = path.join(stylesDir, "variables.css");
  if (fileExists(variablesPath)) {
    console.log(`Reading CSS variables from: ${variablesPath}`);
    const variablesCss = readFile(variablesPath);
    return `/* CSS Variables - Automatically injected from variables.css */\n${variablesCss}\n\n`;
  }
  console.error(`CSS variables file not found: ${variablesPath}`);
  return "";
}
function getComponentStyles() {
  console.log("Collecting component styles...");
  if (!fs.existsSync(componentsDir)) return "";
  let componentStyles = "";
  const componentDirs = fs
    .readdirSync(componentsDir)
    .filter((name) => {
      const p = path.join(componentsDir, name);
      return fs.statSync(p).isDirectory();
    })
    .sort((a, b) => a.localeCompare(b));
  for (const componentName of componentDirs) {
    const componentStylePath = path.join(
      componentsDir,
      componentName,
      `${componentName}.css`
    );
    if (fileExists(componentStylePath)) {
      console.log(`Adding styles from: ${componentStylePath}`);
      const componentCss = readFile(componentStylePath);
      componentStyles += `/* ${componentName} Component Styles */\n${componentCss}\n\n`;
    }
  }
  return componentStyles;
}
function updateStyles() {
  const stylesPath = path.join(publicDir, "styles.css");
  const baseStylesPath = path.join(stylesDir, "base.css");
  const base = readFile(baseStylesPath);
  if (!base) console.warn(`Warning: Base styles missing at ${baseStylesPath}`);
  const cssVariables = getCSSVariables();
  const updatedStyles = [
    cssVariables,
    base,
    "",
    "/* BEGIN COMPONENT STYLES */",
    getComponentStyles(),
    "/* END COMPONENT STYLES */",
    "",
  ].join("\n");
  writeFile(stylesPath, updatedStyles);
}
function processDirectory(srcPath, destPath) {
  console.log(`Processing directory: ${srcPath}`);
  ensureDirectoryExists(destPath);
  try {
    const entries = fs.readdirSync(srcPath, { withFileTypes: true });
    for (const entry of entries) {
      const srcFull = path.join(srcPath, entry.name);
      const destFull = path.join(destPath, entry.name);
      if (entry.isDirectory()) {
        processDirectory(srcFull, destFull);
      } else if (entry.name.endsWith(".html")) {
        const updatedContent = injectComponents(srcFull);
        if (updatedContent) writeFile(destFull, updatedContent);
      } else {
        fs.copyFileSync(srcFull, destFull);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${srcPath}:`, error);
  }
}
function copyComponentScriptsToPublic() {
  if (!fs.existsSync(componentsDir)) return;
  const destBase = path.join(publicDir, "components");
  ensureDirectoryExists(destBase);
  const entries = fs.readdirSync(componentsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    const jsPath = path.join(componentsDir, name, `${name}.js`);
    if (fileExists(jsPath)) {
      const outDir = path.join(destBase, name);
      ensureDirectoryExists(outDir);
      fs.copyFileSync(jsPath, path.join(outDir, `${name}.js`));
      console.log(`Copied component script: ${name}.js`);
    }
  }
}

// -----------------------------
// Blog builder (integrated)
// -----------------------------
function readTemplateOrExit(templatePath) {
  if (!fs.existsSync(templatePath)) {
    console.error(`Template missing: ${templatePath}`);
    process.exit(1);
  }
  return fs.readFileSync(templatePath, "utf8");
}
function copyBlogStaticAssets() {
  if (fs.existsSync(blogStylesFile)) {
    fs.copyFileSync(blogStylesFile, path.join(blogOutputDir, "styles.css"));
    console.log(`Copied blog styles: ${blogStylesFile}`);
  }
  if (fs.existsSync(blogScriptsDir)) {
    const dest = path.join(blogOutputDir, "scripts");
    fs.cpSync(blogScriptsDir, dest, { recursive: true });
    console.log(`Copied blog scripts: ${blogScriptsDir}`);
  }
}
function buildBlog() {
  console.log("Starting the blog build process...");
  ensureDirectoryExists(blogOutputDir);
  copyBlogStaticAssets();

  console.log("Loading and compiling templates...");
  const postTemplateSource = readTemplateOrExit(
    path.join(templateDir, "post-template.html")
  );
  const indexTemplateSource = readTemplateOrExit(
    path.join(templateDir, "index-template.html")
  );
  const postTemplate = Handlebars.compile(postTemplateSource);
  const indexTemplate = Handlebars.compile(indexTemplateSource);

  let blogIndex = [];
  let authors = new Set();
  let categories = new Set();

  console.log("Reading blog posts...");
  if (!fs.existsSync(postsDir)) {
    console.warn(
      `No posts directory found at ${postsDir}. Generating an empty index.`
    );
    generateIndexPage();
    return;
  }

  const files = fs.readdirSync(postsDir).filter((file) => file.endsWith(".md"));

  for (const file of files) {
    try {
      console.log(`Processing post: ${file}`);
      const filePath = path.join(postsDir, file);
      const markdown = fs.readFileSync(filePath, "utf8");
      const { attributes, body } = fm(markdown);

      // Skip drafts unless explicitly included
      if (attributes.draft && process.env.BLOG_INCLUDE_DRAFTS !== "1") {
        console.log(`Skipping draft: ${file}`);
        continue;
      }
      // Validation / normalization
      if (!attributes.title) {
        console.warn(`Post missing title: ${file} — using filename as title`);
        attributes.title = path.basename(file, ".md");
      }
      if (!attributes.date || isNaN(new Date(attributes.date).getTime())) {
        console.warn(
          `Post has invalid or missing date: ${file} — using file mtime`
        );
        const stat = fs.statSync(filePath);
        attributes.date = new Date(stat.mtime).toISOString().slice(0, 10);
      }
      if (attributes.categories && !Array.isArray(attributes.categories)) {
        attributes.categories = [String(attributes.categories)];
      }

      const htmlContent = marked(body);

      // Generate excerpt (prefer front-matter)
      const plainBody = body
        .replace(/```[\s\S]*?```/g, "") // fenced code
        .replace(/`[^`]*`/g, "") // inline code
        .replace(
          /!$begin:math:display$[^$end:math:display$]*\]$begin:math:text$[^)]+$end:math:text$/g,
          ""
        ) // images
        .replace(
          /$begin:math:display$[^$end:math:display$]*\]$begin:math:text$[^)]+$end:math:text$/g,
          ""
        ) // links
        .replace(/[#>*_~\-]+/g, " ") // md punctuation
        .replace(/\s+/g, " ")
        .trim();
      const rawExcerpt = (attributes.excerpt || plainBody.slice(0, 180)).trim();
      const excerpt = /[.!?…]$/.test(rawExcerpt)
        ? rawExcerpt
        : rawExcerpt + "…";

      const outputFileName = file.replace(".md", ".html");
      const data = {
        title: attributes.title,
        author: attributes.author || "Unknown",
        date: attributes.date,
        categories: attributes.categories || [],
        content: htmlContent,
        excerpt,
        url: `/blog/${outputFileName}`,
      };

      authors.add(data.author);
      data.categories.forEach((cat) => categories.add(cat));

      const filledTemplate = postTemplate(data);
      const outputPath = path.join(blogOutputDir, outputFileName);
      fs.writeFileSync(outputPath, filledTemplate);

      blogIndex.push(data);
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }

  blogIndex.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  generateIndexPage();

  function generateIndexPage() {
    const indexData = {
      posts: blogIndex,
      authors: Array.from(authors).sort(),
      categories: Array.from(categories).sort(),
    };
    const filledIndexTemplate = indexTemplate(indexData);
    fs.writeFileSync(
      path.join(blogOutputDir, "index.html"),
      filledIndexTemplate
    );

    const RECENT_COUNT = Math.max(
      0,
      parseInt(process.env.BLOG_RECENT_COUNT || "3", 10) || 3
    );
    const recentPosts = blogIndex.slice(0, RECENT_COUNT).map((post) => ({
      title: post.title,
      date: post.date,
      category: post.categories[0] || "",
      excerpt: post.excerpt,
      author: post.author,
      url: post.url,
    }));
    fs.writeFileSync(
      path.join(blogOutputDir, "recent-posts.json"),
      JSON.stringify(recentPosts, null, 2)
    );

    if (blogIndex.length === 0) {
      console.warn("No blog posts found. Generated index with no entries.");
    }
    console.log("Blog build completed successfully!");
  }
}

// -----------------------------
// Top-level build
// -----------------------------
function build() {
  console.log("Starting site build…");

  // Clean public directory
  cleanDirectory(publicDir);

  // Pages -> public (component injection)
  processDirectory(pagesDir, publicDir);

  // Static assets
  copyDirectory(assetsDir, publicDir);

  // Component scripts (JS only)
  copyComponentScriptsToPublic();

  // Styles bundle
  updateStyles();

  // Blog
  buildBlog();

  console.log("Build complete -> public/");
}

build();
