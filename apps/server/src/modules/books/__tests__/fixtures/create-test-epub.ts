import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

async function createTestEpub() {
  const zip = new JSZip();

  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  );

  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test EPUB Book</dc:title>
    <dc:creator>Test Author</dc:creator>
    <dc:publisher>Test Publisher</dc:publisher>
    <dc:description>A test book for unit testing</dc:description>
    <dc:language>en</dc:language>
    <dc:date>2024-01-15</dc:date>
    <meta name="cover" content="cover-img"/>
  </metadata>
  <manifest>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="cover-img" href="images/cover.png" media-type="image/png"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`,
  );

  zip.file(
    "OEBPS/chapter1.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter 1</title><link rel="stylesheet" href="style.css"/></head>
<body>
  <h1 id="intro">Introduction</h1>
  <p>Welcome to the test book.</p>
  <h2 id="setup">Getting Started</h2>
  <p>This is section two.</p>
  <img src="images/cover.png" alt="Cover"/>
</body>
</html>`,
  );

  zip.file(
    "OEBPS/chapter2.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter 2</title><link rel="stylesheet" href="style.css"/></head>
<body>
  <h1 id="advanced">Advanced Topics</h1>
  <p>Deep dive into testing.</p>
</body>
</html>`,
  );

  zip.file(
    "OEBPS/style.css",
    `body { font-size: 16px; line-height: 1.6; }
.chapter p { margin-bottom: 1em; }
h1 { color: #333; }`,
  );

  const pngBuf = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  zip.file("OEBPS/images/cover.png", pngBuf);

  zip.file(
    "OEBPS/nav.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<body>
<nav epub:type="toc"><ol>
  <li><a href="chapter1.xhtml">Introduction</a></li>
  <li><a href="chapter2.xhtml">Advanced Topics</a></li>
</ol></nav>
</body>
</html>`,
  );

  const buf = await zip.generateAsync({ type: "nodebuffer" });
  const dir = dirname(fileURLToPath(import.meta.url));
  writeFileSync(resolve(dir, "test.epub"), buf);
  console.log("test.epub created");
}

createTestEpub();
