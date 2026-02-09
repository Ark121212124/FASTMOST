const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const crypto = require("crypto");

/* ===== PATHS ===== */
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");

/* ===== HTTP ===== */
const server = http.createServer((req, res) => {
  const safe = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(PUBLIC, safe);

  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403);
    return res.end();
  }

  fs.readFile(filePath, (e, d) => {
    if (e) {
      res.writeHead(404);
      return res.end();
    }

    const types = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".svg": "image/svg+xml"
    };

    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "text/plain"
    });
    res.end(d);
  });
});

/* ===== WEBSOCKET ===== */
const wss = new WebSocket.Server({ server });
const clients = new Set();

function broadcast(data) {
  const msg = JSON.stringify(data);
  clients.forEach(ws => {
    if (ws.readyState === 1) ws.send(msg);
  });
}

wss.on("connection", ws => {
  ws.username = "Guest";
  ws.avatar = "/logo.svg";
  ws.channel = "общий";

  clients.add(ws);
  broadcast({ type: "online", count: clients.size });

  ws.on("message", raw => {
    let d;
    try { d = JSON.parse(raw); } catch { return; }

    if (d.type === "join") {
      ws.username = d.user;
      ws.avatar = d.avatar;
      ws.channel = d.channel;

      broadcast({
        type: "users",
        users: [...clients]
          .filter(c => c.channel === ws.channel)
          .map(c => ({
            username: c.username,
            avatar: c.avatar
          }))
      });
    }

    if (d.type === "message") {
      broadcast(d);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    broadcast({ type: "online", count: clients.size });
  });
});

server.listen(process.env.PORT || 10000, () =>
  console.log("🚀 FASTMOST server running")
);
