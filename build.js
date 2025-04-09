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

// Create a backup of the original file
function backupFile(filePath) {
  if (fileExists(filePath)) {
    const backupPath = `${filePath}.backup`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`Created backup: ${backupPath}`);
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
        const scriptTag = `<script src="/src/components/${componentName}/${componentName}.js"></script>\n</body>`;
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

  // Backup the original styles.css
  backupFile(stylesPath);

  // Read the existing styles
  let existingStyles = "";
  if (fileExists(stylesPath)) {
    existingStyles = readFile(stylesPath);
  }

  // Get CSS variables
  const cssVariables = getCSSVariables();

  // Find if there's a components section already
  const componentStartMarker = "/* BEGIN COMPONENT STYLES */";
  const componentEndMarker = "/* END COMPONENT STYLES */";

  // Find if there's a root variables section (to remove it)
  const rootVarsPattern = /\/\* Root Variables \*\/[\s\S]*?}/;

  // Remove the existing root variables section if it exists
  if (rootVarsPattern.test(existingStyles)) {
    console.log("Removing existing root variables section");
    existingStyles = existingStyles.replace(rootVarsPattern, "");
  }

  let updatedStyles = "";

  // Add CSS variables at the beginning
  updatedStyles = cssVariables;

  if (
    existingStyles.includes(componentStartMarker) &&
    existingStyles.includes(componentEndMarker)
  ) {
    // Replace the existing component styles section
    const beforeComponents = existingStyles.split(componentStartMarker)[0];
    const afterComponents = existingStyles.split(componentEndMarker)[1];

    updatedStyles +=
      beforeComponents +
      componentStartMarker +
      "\n" +
      getComponentStyles() +
      componentEndMarker +
      afterComponents;
  } else {
    // Add component styles at the end
    updatedStyles +=
      existingStyles +
      "\n\n" +
      componentStartMarker +
      "\n" +
      getComponentStyles() +
      componentEndMarker +
      "\n";
  }

  // Write the updated styles
  writeFile(stylesPath, updatedStyles);
}

// Process all HTML files in a directory
function processDirectory(dirPath) {
  console.log(`Processing directory: ${dirPath}`);

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively process subdirectories
        processDirectory(fullPath);
      } else if (entry.name.endsWith(".html")) {
        // Process HTML files
        console.log(`Found HTML file: ${fullPath}`);
        const updatedContent = injectComponents(fullPath);

        if (updatedContent) {
          writeFile(fullPath, updatedContent);
        }
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error);
  }
}

// Build process
function build() {
  console.log("Starting component build process...");

  // Process all HTML files in the public directory and its subdirectories
  processDirectory(publicDir);

  // Update styles with component styles
  updateStyles();

  console.log("Component build complete!");
}

build();
