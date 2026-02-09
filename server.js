const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const crypto = require("crypto");

/* ===== PATHS ===== */
const PUBLIC = path.join(__dirname, "public");

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

/* ===== WEBSOCKET (SIGNALLING) ===== */
const wss = new WebSocket.Server({ server });
const clients = new Map(); // id -> ws

function send(ws, data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

function broadcast(data, exceptId = null) {
  for (const [id, ws] of clients) {
    if (id !== exceptId) send(ws, data);
  }
}

wss.on("connection", ws => {
  ws.id = crypto.randomUUID();
  ws.username = "Guest";
  ws.voice = null;

  clients.set(ws.id, ws);

  ws.on("message", raw => {
    let d;
    try { d = JSON.parse(raw); } catch { return; }

    /* ===== USER INFO ===== */
    if (d.type === "join") {
      ws.username = d.user;
      return;
    }

    /* ===== VOICE JOIN ===== */
    if (d.type === "voice-join") {
      ws.voice = d.channel;

      // уведомляем остальных
      broadcast({
        type: "voice-user-joined",
        userId: ws.id,
        username: ws.username
      }, ws.id);

      // отправляем новичку список уже сидящих
      const users = [];
      for (const [id, c] of clients) {
        if (c.voice === ws.voice && id !== ws.id) {
          users.push({ id, username: c.username });
        }
      }

      send(ws, {
        type: "voice-users",
        users
      });
    }

    /* ===== VOICE LEAVE ===== */
    if (d.type === "voice-leave") {
      ws.voice = null;
      broadcast({
        type: "voice-user-left",
        userId: ws.id
      }, ws.id);
    }

    /* ===== WEBRTC SIGNAL ===== */
    if (
      d.type === "voice-offer" ||
      d.type === "voice-answer" ||
      d.type === "voice-ice"
    ) {
      const to = clients.get(d.to);
      if (to) {
        send(to, {
          ...d,
          from: ws.id
        });
      }
    }
  });

  ws.on("close", () => {
    clients.delete(ws.id);
    broadcast({
      type: "voice-user-left",
      userId: ws.id
    });
  });
});

server.listen(process.env.PORT || 10000, () =>
  console.log("🎧 FASTMOST WebRTC signalling server ready")
);
