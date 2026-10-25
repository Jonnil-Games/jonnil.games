import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve("public");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".xml": "application/xml",
};
const server = http.createServer(async (req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405).end();
    return;
  }
  const file = path.resolve(
    root,
    "." + new URL(req.url, "http://localhost").pathname
  );
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const resolved = (await fs.stat(file)).isDirectory()
      ? path.join(file, "index.html")
      : file;
    const data = await fs.readFile(resolved);
    res.writeHead(200, {
      "Content-Type":
        types[path.extname(resolved)] || "application/octet-stream",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404).end();
  }
});
server.listen(3100, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close());
