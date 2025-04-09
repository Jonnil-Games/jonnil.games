const fs = require("fs");
const path = require("path");

// Paths
const srcDir = path.join(__dirname, "src");
const publicDir = path.join(__dirname, "public");
const componentsDir = path.join(srcDir, "components");
const stylesDir = path.join(srcDir, "styles");

// Helper to read a file
function readFile(filePath) {
  return fs.readFileSync(filePath, "utf-8");
}

// Helper to write a file
function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, "utf-8");
}

// Inject components into a page
function injectComponents(pagePath) {
  let pageContent = readFile(pagePath);

  // Inject header
  const headerPath = path.join(componentsDir, "header", "header.html");
  const headerContent = readFile(headerPath);
  pageContent = pageContent.replace("<!-- HEADER -->", headerContent);

  return pageContent;
}

// Combine styles
function combineStyles() {
  const universalStyles = readFile(path.join(stylesDir, "variables.css"));
  const headerStyles = readFile(
    path.join(componentsDir, "header", "header.css")
  );

  return `${universalStyles}\n${headerStyles}`;
}

// Build process
function build() {
  // Process index.html
  const indexPath = path.join(publicDir, "index.html");
  const updatedIndexContent = injectComponents(indexPath);
  writeFile(indexPath, updatedIndexContent);

  // Combine and write styles
  const combinedStyles = combineStyles();
  const stylesPath = path.join(publicDir, "styles.css");
  writeFile(stylesPath, combinedStyles);

  console.log("Build complete!");
}

build();
