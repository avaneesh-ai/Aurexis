import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

async function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(__dirname, safePath));

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream"
    });
    res.end(data);
  } catch {
    const index = await fs.readFile(path.join(__dirname, "index.html"));
    res.writeHead(200, { "Content-Type": mimeTypes[".html"] });
    res.end(index);
  }
}

async function serveApi(req, res, pathname) {
  const apiFile = path.join(__dirname, `${pathname}.js`);

  try {
    await fs.access(apiFile);
    const moduleUrl = `${pathToFileURL(apiFile).href}?t=${Date.now()}`;
    const mod = await import(moduleUrl);
    await mod.default(req, res);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: error.message || "API route failed" }));
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith("/api/")) {
    await serveApi(req, res, url.pathname);
    return;
  }

  await serveStatic(req, res, url.pathname);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Aurexis is running at http://localhost:${port}`);
});
