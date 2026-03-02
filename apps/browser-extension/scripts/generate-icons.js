import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "..", "icons");

fs.mkdirSync(iconsDir, { recursive: true });

// 1x1 transparent PNG (smallest valid PNG)
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB" +
  "Nl7BcQAAAABJRU5ErkJggg==",
  "base64"
);

for (const size of [16, 48, 128]) {
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), PNG_1x1);
}

console.log("Placeholder icons created");
