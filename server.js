const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const multer = require("multer");
const crypto = require("crypto");

/* ===== PATHS ===== */
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const USERS_FILE = path.join(ROOT, "users.json");
const AVATARS = path.join(ROOT, "avatars");
const CHANNELS = path.join(ROOT, "channels");

/* ===== INIT ===== */
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");
if (!fs.existsSync(AVATARS)) fs.mkdirSync(AVATARS);
if (!fs.existsSync(CHANNELS)) fs.mkdirSync(CHANNELS);

/* ===== UPLOAD ===== */
const upload = multer({ dest: AVATARS });

/* ===== HTTP SERVER ===== */
const server = http.createServer((req, res) => {

  /* ===== AVATAR UPLOAD ===== */
  if (req.method === "POST" && req.url === "/upload-avatar") {
    upload.single("avatar")(req, res, () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        url: "/avatars/" + req.file.filename
      }));
    });
    return;
  }

  /* ===== STATIC FILES ===== */
  const safeUrl = req.url === "/" ? "/index.html" : req.url;

  /* --- avatars --- */
  if (safeUrl.startsWith("/avatars/")) {
    const avatarPath = path.join(AVATARS, path.basename(safeUrl));

    if (!avatarPath.startsWith(AVATARS)) {
      res.writeHead(403);
      return res.end();
    }

    return fs.readFile(avatarPath, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end();
      }
      res.writeHead(200);
      res.end(data);
    });
  }

  /* --- public files --- */
  const filePath = path.join(PUBLIC, safeUrl.slice(1));

  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403);
    return res.end();
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end();
    }

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
      "Content-Type": types[path.extname(filePath)] || "application/octet-stream"
    });
    res.end(data);
  });
});

/* ===== WEBSOCKET ===== */
const wss = new WebSocket.Server({ server });
const clients = new Set();

/* ===== HELPERS ===== */
function broadcast(data) {
  const msg = JSON.stringify(data);
  clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(msg);
  });
}

/* ===== WS LOGIC ===== */
wss.on("connection", ws => {
  ws.id = crypto.randomUUID();
  ws.username = "Guest";
  ws.avatar = "/logo.svg";
  ws.channel = "общий";
  ws.speaking = false;

  clients.add(ws);
  broadcast({ type: "online", count: clients.size });

  ws.on("message", raw => {
    let data;
    try { data = JSON.parse(raw); } catch { return; }

    /* ===== JOIN CHANNEL ===== */
    if (data.type === "join") {
      ws.username = data.user;
      ws.avatar = data.avatar || ws.avatar;
      ws.channel = data.channel;

      const file = path.join(CHANNELS, ws.channel + ".json");
      if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");

      ws.send(JSON.stringify({
        type: "history",
        messages: JSON.parse(fs.readFileSync(file))
      }));

      broadcast({
        type: "users",
        users: [...clients]
          .filter(c => c.channel === ws.channel)
          .map(c => ({
            username: c.username,
            avatar: c.avatar,
            speaking: c.speaking
          }))
      });
    }

    /* ===== TEXT MESSAGE ===== */
    if (data.type === "message") {
      const file = path.join(CHANNELS, ws.channel + ".json");
      const msgs = fs.existsSync(file)
        ? JSON.parse(fs.readFileSync(file))
        : [];

      msgs.push(data);
      fs.writeFileSync(file, JSON.stringify(msgs, null, 2));
      broadcast(data);
    }

    /* ===== VOICE ACTIVITY ===== */
    if (data.type === "voice-activity") {
      ws.speaking = data.speaking;
      broadcast({
        type: "voice-activity",
        user: ws.username,
        speaking: data.speaking
      });
    }

    /* ===== WEBRTC SIGNALING ===== */
    if (data.type.startsWith("voice-")) {
      clients.forEach(c => {
        if (c.id === data.to) {
          c.send(JSON.stringify({ ...data, from: ws.id }));
        }
      });
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    broadcast({ type: "online", count: clients.size });
  });
});

/* ===== START ===== */
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log("🚀 FASTMOST running on port", PORT);
});

