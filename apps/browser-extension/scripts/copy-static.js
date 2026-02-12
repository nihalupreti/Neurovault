import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const src = path.join(root, "src");
const icons = path.join(root, "icons");

const isFirefox = process.argv.includes("--firefox");

fs.mkdirSync(path.join(dist, "icons"), { recursive: true });

// Copy manifest
const manifestFile = isFirefox ? "manifest.firefox.json" : "manifest.json";
fs.copyFileSync(
  path.join(src, manifestFile),
  path.join(dist, "manifest.json")
);

// Copy HTML and CSS
fs.copyFileSync(path.join(src, "options.html"), path.join(dist, "options.html"));
fs.copyFileSync(path.join(src, "options.css"), path.join(dist, "options.css"));

// Copy icons
for (const file of fs.readdirSync(icons)) {
  fs.copyFileSync(path.join(icons, file), path.join(dist, "icons", file));
}

console.log(`Build complete (${isFirefox ? "Firefox" : "Chrome"})`);
