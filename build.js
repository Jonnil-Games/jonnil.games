const fs = require("fs");
const path = require("path");

// Paths
const srcDir = path.join(__dirname, "src");
const publicDir = path.join(__dirname, "public");
const componentsDir = path.join(srcDir, "components");
const stylesDir = path.join(srcDir, "styles");

// Helper to ensure directory exists
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Helper to check if file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Helper to read a file safely
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

// Helper to write a file
function writeFile(filePath, content) {
  try {
    ensureDirectoryExists(path.dirname(filePath));
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`File written: ${filePath}`);
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
  }
}

// Inject components into a page
function injectComponents(pagePath) {
  console.log(`Injecting components into: ${pagePath}`);
  if (!fileExists(pagePath)) {
    console.error(`Page not found: ${pagePath}`);
    return null;
  }

  let pageContent = readFile(pagePath);

  // Inject header component
  const headerPath = path.join(componentsDir, "header", "header.html");
  if (fileExists(headerPath)) {
    console.log(`Injecting header from: ${headerPath}`);
    const headerContent = readFile(headerPath);
    // Replace the placeholder with the component content
    pageContent = pageContent.replace("<!-- HEADER -->", headerContent);
  } else {
    console.error(`Header component not found: ${headerPath}`);
  }

  return pageContent;
}

// Combine styles
function combineStyles() {
  console.log("Combining styles...");
  let combinedStyles = "";

  // Add reset.css if it exists
  const resetCssPath = path.join(stylesDir, "reset.css");
  if (fileExists(resetCssPath)) {
    combinedStyles += readFile(resetCssPath) + "\n\n";
  }

  // Add variables.css if it exists
  const variablesCssPath = path.join(stylesDir, "variables.css");
  if (fileExists(variablesCssPath)) {
    combinedStyles += readFile(variablesCssPath) + "\n\n";
  }

  // Add component styles
  const headerStylesPath = path.join(componentsDir, "header", "header.css");
  if (fileExists(headerStylesPath)) {
    combinedStyles += readFile(headerStylesPath) + "\n\n";
  }

  return combinedStyles;
}

// Build process
function build() {
  console.log("Starting build process...");

  // Process index.html
  const indexPath = path.join(publicDir, "index.html");
  const updatedIndexContent = injectComponents(indexPath);

  if (updatedIndexContent) {
    writeFile(indexPath, updatedIndexContent);
  }

  // Combine and write styles
  const combinedStyles = combineStyles();
  if (combinedStyles) {
    const stylesPath = path.join(publicDir, "styles.css");
    writeFile(stylesPath, combinedStyles);
  }

  console.log("Build complete!");
}

build();
