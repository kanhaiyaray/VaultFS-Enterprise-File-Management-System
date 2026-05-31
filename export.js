const fs = require("fs");
const path = require("path");

const ROOT_DIR = process.cwd();

const IGNORE_FOLDERS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  ".vscode"
];

const IGNORE_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.production"
];

const ALLOWED_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".html",
  ".css"
];

const output = {
  generatedAt: new Date().toISOString(),
  project: path.basename(ROOT_DIR),
  files: []
};

function shouldIgnore(filePath) {
  const fileName = path.basename(filePath);

  // Ignore folders
  if (
    IGNORE_FOLDERS.some(folder =>
      filePath.includes(path.sep + folder)
    )
  ) {
    return true;
  }

  // Ignore env files
  if (
    IGNORE_FILES.includes(fileName) ||
    fileName.startsWith(".env")
  ) {
    return true;
  }

  return false;
}

function walk(dir) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);

    if (shouldIgnore(fullPath)) continue;

    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath);
    } else {
      const ext = path.extname(fullPath);

      if (ALLOWED_EXTENSIONS.includes(ext)) {
        try {
          const content = fs.readFileSync(fullPath, "utf8");

          output.files.push({
            path: path.relative(ROOT_DIR, fullPath),
            extension: ext,
            size: stat.size,
            content
          });

          console.log("EXTRACTED:", fullPath);
        } catch (err) {
          console.log("FAILED:", fullPath);
        }
      }
    }
  }
}

walk(ROOT_DIR);

fs.writeFileSync(
  "codebase-export.json",
  JSON.stringify(output, null, 2),
  "utf8"
);

console.log("\nDONE!");
console.log(`Total files: ${output.files.length}`);
console.log("Saved: codebase-export.json");
