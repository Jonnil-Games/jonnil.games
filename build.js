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
// Site URL (Netlify-aware)
// -----------------------------
function getSiteUrl() {
  const raw =
    process.env.SITE_URL ||
    process.env.URL || // Netlify production site URL
    process.env.DEPLOY_PRIME_URL || // Deploy Preview URL
    process.env.DEPLOY_URL || // Specific deploy URL
    "http://localhost:8888";
  return String(raw).replace(/\/+$/, "");
}
const SITE_URL = getSiteUrl();

// Blog feed meta (env-overridable)
const BLOG_TITLE = process.env.BLOG_TITLE || "Jonnil Games Blog";
const BLOG_DESC =
  process.env.BLOG_DESC || "Indie dev logs, updates, and brain leaks.";
const BLOG_LANG = process.env.BLOG_LANG || "en-us";
const BLOG_AUTHOR = process.env.BLOG_AUTHOR || "Jonnil";

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

      // Note: header now ships with inline JS in its HTML; do not auto-inject external component scripts

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
    // No-op: external component JS is not required (inline where needed)
  }
}

// -----------------------------
// Feeds (RSS 2.0 and Atom 1.0)
// -----------------------------
function xmlEscape(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
function absUrl(p = "") {
  return p.startsWith("http") ? p : SITE_URL + p;
}
function rfc2822(dateStr) {
  return new Date(dateStr).toUTCString();
}
function iso8601(dateStr) {
  return new Date(dateStr).toISOString();
}

function buildRSS(posts) {
  const lastBuild = posts[0]?.date
    ? rfc2822(posts[0].date)
    : new Date().toUTCString();
  const items = posts
    .map((p) => {
      const link = absUrl(p.url);
      const cats = (p.categories || [])
        .map((c) => `    <category>${xmlEscape(c)}</category>`)
        .join("\n");
      return [
        "  <item>",
        `    <title>${xmlEscape(p.title)}</title>`,
        `    <link>${link}</link>`,
        `    <guid isPermaLink="true">${link}</guid>`,
        `    <pubDate>${rfc2822(p.date)}</pubDate>`,
        cats,
        `    <description>${xmlEscape(p.excerpt || "")}</description>`,
        `    <content:encoded><![CDATA[${p.content || ""}]]></content:encoded>`,
        "  </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>${xmlEscape(BLOG_TITLE)}</title>
  <link>${absUrl("/blog/")}</link>
  <description>${xmlEscape(BLOG_DESC)}</description>
  <language>${xmlEscape(BLOG_LANG)}</language>
  <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
</channel>
</rss>
`;
}

function buildAtom(posts) {
  const updated = posts[0]?.date
    ? iso8601(posts[0].date)
    : new Date().toISOString();
  const entries = posts
    .map((p) => {
      const link = absUrl(p.url);
      const cats = (p.categories || [])
        .map((c) => `    <category term="${xmlEscape(c)}"/>`)
        .join("\n");
      return [
        "  <entry>",
        `    <title>${xmlEscape(p.title)}</title>`,
        `    <id>${link}</id>`,
        `    <link href="${link}"/>`,
        `    <updated>${iso8601(p.date)}</updated>`,
        `    <published>${iso8601(p.date)}</published>`,
        `    <author><name>${xmlEscape(
          p.author || BLOG_AUTHOR
        )}</name></author>`,
        cats,
        `    <summary type="html">${xmlEscape(p.excerpt || "")}</summary>`,
        `    <content type="html">${xmlEscape(p.content || "")}</content>`,
        "  </entry>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${xmlEscape(BLOG_TITLE)}</title>
  <id>${absUrl("/blog/")}</id>
  <updated>${updated}</updated>
  <link href="${absUrl("/blog/atom.xml")}" rel="self"/>
  <link href="${absUrl("/blog/")}"/>
  <author><name>${xmlEscape(BLOG_AUTHOR)}</name></author>
${entries}
</feed>
`;
}

// -----------------------------
// Sitemap generator
// -----------------------------
function walkHtmlFiles(dir, base = publicDir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkHtmlFiles(full, base));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      const rel = path.relative(base, full).replace(/\\/g, "/");
      results.push({ full, rel });
    }
  }
  return results;
}

function relPathToUrl(rel) {
  // map index.html to directory URL, otherwise keep the .html filename
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html"))
    return `/${rel.slice(0, -"index.html".length)}`;
  return `/${rel}`;
}

function fileLastModISO(fullPath) {
  try {
    const stat = fs.statSync(fullPath);
    // YYYY-MM-DD format is valid for <lastmod>, but ISO8601 is also fine
    return new Date(stat.mtime).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function buildSitemap() {
  console.log("Generating sitemap.xml…");
  const pages = walkHtmlFiles(publicDir)
    // Exclude anything inside blog/scripts (non-pages)
    .filter((f) => !/^blog\/scripts\//.test(f.rel));

  const urlset = pages
    .map(({ full, rel }) => {
      const loc = absUrl(relPathToUrl(rel));
      const lastmod = fileLastModISO(full);
      // changefreq/priority are optional; set gentle defaults
      return [
        "  <url>",
        `    <loc>${xmlEscape(loc)}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>weekly</changefreq>`,
        `    <priority>${rel === "index.html" ? "1.0" : "0.7"}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>
`;
  writeFile(path.join(publicDir, "sitemap.xml"), xml);
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
        siteUrl: SITE_URL, // for canonical in templates
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
      siteUrl: SITE_URL, // for canonical in templates
      url: "/blog/", // canonical path for blog index
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

    // Feeds
    const rssXml = buildRSS(blogIndex);
    writeFile(path.join(blogOutputDir, "rss.xml"), rssXml);

    const atomXml = buildAtom(blogIndex);
    writeFile(path.join(blogOutputDir, "atom.xml"), atomXml);

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

  // Sitemap
  buildSitemap();

  console.log("Build complete -> public/");
}

build();
