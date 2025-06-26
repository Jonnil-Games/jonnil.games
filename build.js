const fs = require("fs");
const path = require("path");

// Paths
const srcDir = path.join(__dirname, "src");
const publicDir = path.join(__dirname, "public");
const componentsDir = path.join(srcDir, "components");
const stylesDir = path.join(srcDir, "styles");
const pagesDir = path.join(srcDir, "pages");
const assetsDir = path.join(srcDir, "assets");

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

// Create a backup of the original file
function backupFile(filePath) {
  if (fileExists(filePath)) {
    const backupPath = `${filePath}.backup`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`Created backup: ${backupPath}`);
  }
}

// Remove and recreate a directory
function cleanDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  fs.mkdirSync(dirPath, { recursive: true });
}

// Recursively copy a directory
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

// Inject components into a page
function injectComponents(pagePath) {
  console.log(`Injecting components into: ${pagePath}`);
  if (!fileExists(pagePath)) {
    console.error(`Page not found: ${pagePath}`);
    return null;
  }

  // Backup the original file
  backupFile(pagePath);

  let pageContent = readFile(pagePath);

  // Find all cyan component tags
  const componentRegex = /<cyan\s+component="([^"]+)"[^>]*><\/cyan>/g;
  let match;

  while ((match = componentRegex.exec(pageContent)) !== null) {
    const [fullMatch, componentName] = match;
    const componentPath = path.join(
      componentsDir,
      componentName,
      `${componentName}.html`
    );

    if (fileExists(componentPath)) {
      console.log(`Injecting ${componentName} from: ${componentPath}`);
      const componentContent = readFile(componentPath);
      pageContent = pageContent.replace(fullMatch, componentContent);

      // Add component's JS if it exists
      const jsPath = path.join(
        componentsDir,
        componentName,
        `${componentName}.js`
      );
      if (fileExists(jsPath) && !pageContent.includes(`${componentName}.js`)) {
        const scriptTag = `<script src="/components/${componentName}/${componentName}.js"></script>\n</body>`;
        pageContent = pageContent.replace("</body>", scriptTag);
        console.log(`Added ${componentName}.js script to the page`);
      }
    } else {
      console.error(`Component not found: ${componentPath}`);
    }
  }

  return pageContent;
}

// Get CSS variables from variables.css
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

// Get component styles
function getComponentStyles() {
  console.log("Collecting component styles...");
  let componentStyles = "";

  // Read all component directories
  const componentDirs = fs.readdirSync(componentsDir);

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

// Update the styles in public/styles.css
function updateStyles() {
  const stylesPath = path.join(publicDir, "styles.css");

  // Read the base styles from src
  const baseStylesPath = path.join(stylesDir, "base.css");
  const existingStyles = readFile(baseStylesPath);

  // Get CSS variables
  const cssVariables = getCSSVariables();

  const componentStartMarker = "/* BEGIN COMPONENT STYLES */";
  const componentEndMarker = "/* END COMPONENT STYLES */";

  let updatedStyles = "";

  // Add CSS variables at the beginning
  updatedStyles = cssVariables;

  updatedStyles +=
    existingStyles +
    "\n\n" +
    componentStartMarker +
    "\n" +
    getComponentStyles() +
    componentEndMarker +
    "\n";

  // Write the updated styles
  writeFile(stylesPath, updatedStyles);
}

// Process all HTML files in a directory
function processDirectory(srcPath, destPath) {
  console.log(`Processing directory: ${srcPath}`);
  ensureDirectoryExists(destPath);

  try {
    const entries = fs.readdirSync(srcPath, { withFileTypes: true });

    for (const entry of entries) {
      const srcFull = path.join(srcPath, entry.name);
      const destFull = path.join(destPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively process subdirectories
        processDirectory(srcFull, destFull);
      } else if (entry.name.endsWith(".html")) {
        // Process HTML files
        console.log(`Found HTML file: ${srcFull}`);
        const updatedContent = injectComponents(srcFull);

        if (updatedContent) {
          writeFile(destFull, updatedContent);
        }
      } else {
        fs.copyFileSync(srcFull, destFull);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${srcPath}:`, error);
  }
}

// Build process
function build() {
  console.log("Starting component build process...");

  // Clean public directory
  cleanDirectory(publicDir);

  // Process all HTML files from src/pages into public
  processDirectory(pagesDir, publicDir);

  // Copy static assets
  copyDirectory(assetsDir, publicDir);
  // Copy component scripts
  copyDirectory(componentsDir, path.join(publicDir, "components"));

  // Update styles with component styles
  updateStyles();

  console.log("Component build complete!");
}

build();
