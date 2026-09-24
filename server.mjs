import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 4173);
const root = process.cwd();
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

createServer((request, response) => {
  const rawPath = request.url === "/" ? "/index.html" : request.url.split("?")[0];
  const requestPath = decodeURIComponent(rawPath);
  const filePath = normalize(join(root, requestPath));

  if (!filePath.startsWith(root) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const fileSize = statSync(filePath).size;
  const contentType = contentTypes[extname(filePath)] || "application/octet-stream";
  const isVideo = contentType.startsWith("video/");
  const range = request.headers.range;

  if (range && isVideo) {
    const [startText, endText] = range.replace(/bytes=/, "").split("-");
    const start = Number(startText);
    const end = endText ? Number(endText) : fileSize - 1;
    const chunkSize = end - start + 1;

    response.writeHead(206, {
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Content-Type": contentType,
    });
    createReadStream(filePath, { start, end }).pipe(response);
    return;
  }

  response.writeHead(200, {
    "Accept-Ranges": isVideo ? "bytes" : "none",
    "Content-Length": fileSize,
    "Content-Type": contentType,
  });
  createReadStream(filePath).pipe(response);
}).listen(port, () => {
  console.log(`Portfolio prototype running at http://localhost:${port}`);
});
