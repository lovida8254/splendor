/* Minimal static file server for testing the exported PWA bundle. */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";

const ROOT = process.argv[2] || "out";
const PORT = Number(process.argv[3] || 3002);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path.endsWith("/")) path += "index.html";
    let file = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ""));
    try {
      const s = await stat(file);
      if (s.isDirectory()) file = join(file, "index.html");
    } catch {
      // try .html, else 404 page
      try {
        await stat(file + ".html");
        file = file + ".html";
      } catch {
        file = join(ROOT, "404.html");
      }
    }
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}).listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}`));
