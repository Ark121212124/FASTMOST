const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PUBLIC_DIR = path.join(__dirname, "public");

const server = http.createServer((req, res) => {
  let filePath = path.join(
    PUBLIC_DIR,
    req.url === "/" ? "index.html" : req.url
  );

  // защита от ../
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  // если файл без расширения — 404
  if (!path.extname(filePath)) {
    res.writeHead(404);
    return res.end("Not found");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }

    const ext = path.extname(filePath);

    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".json": "application/json"
    };

    res.writeHead(200, {
      "Content-Type": types[ext] || "application/octet-stream"
    });

    res.end(data);
  });
});

// ===== WEBSOCKET =====
const wss = new WebSocket.Server({ server });
let sockets = [];

function broadcast(data) {
  const msg = JSON.stringify(data);
  sockets.forEach(s => {
    if (s.readyState === WebSocket.OPEN) {
      s.send(msg);
    }
  });
}

wss.on("connection", ws => {
  sockets.push(ws);

  // онлайн
  broadcast({ type: "online", count: sockets.length });

  ws.on("message", msg => {
    try {
      const data = JSON.parse(msg);
      broadcast(data);
    } catch {
      // игнор мусор
    }
  });

  ws.on("close", () => {
    sockets = sockets.filter(s => s !== ws);
    broadcast({ type: "online", count: sockets.length });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🚀 FASTMOST running on port", PORT);
});
