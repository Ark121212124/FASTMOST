const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const multer = require("multer");

/* ===== PATHS ===== */
const PUBLIC = path.join(__dirname, "public");
const USERS_FILE = path.join(__dirname, "users.json");
const AVATARS = path.join(__dirname, "avatars");
const CHANNELS = path.join(__dirname, "channels");

/* ===== INIT ===== */
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");
if (!fs.existsSync(AVATARS)) fs.mkdirSync(AVATARS);
if (!fs.existsSync(CHANNELS)) fs.mkdirSync(CHANNELS);

/* ===== UPLOAD ===== */
const upload = multer({ dest: AVATARS });

/* ===== HTTP ===== */
const server = http.createServer((req, res) => {
  // avatar upload
  if (req.method === "POST" && req.url === "/upload-avatar") {
    upload.single("avatar")(req, res, () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        url: "/avatars/" + req.file.filename
      }));
    });
    return;
  }

  const safe = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(
    safe.startsWith("/avatars") ? AVATARS : PUBLIC,
    safe.replace("/avatars", "")
  );

  if (!filePath.startsWith(PUBLIC) && !filePath.startsWith(AVATARS)) {
    res.writeHead(403);
    return res.end();
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end();
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

/* ===== WEBSOCKET ===== */
const wss = new WebSocket.Server({ server });
const clients = new Set();
const voiceChannels = {}; // { name: Set(ws) }

/* ===== HELPERS ===== */
function broadcast(data) {
  const msg = JSON.stringify(data);
  clients.forEach(c => c.readyState === 1 && c.send(msg));
}

function usersInChannel(channel) {
  return [...clients]
    .filter(c => c.channel === channel)
    .map(c => ({
      username: c.username,
      avatar: c.avatar
    }));
}

/* ===== WS LOGIC ===== */
wss.on("connection", ws => {
  ws.username = "Guest";
  ws.avatar = "/logo.svg";
  ws.channel = "общий";
  ws.voice = null;
  ws.id = ws._socket.remotePort;

  clients.add(ws);
  broadcast({ type: "online", count: clients.size });

  ws.on("message", raw => {
    let data;
    try { data = JSON.parse(raw); } catch { return; }

    /* TEXT JOIN */
    if (data.type === "join") {
      ws.username = data.user;
      ws.avatar = data.avatar || ws.avatar;
      ws.channel = data.channel;

      const file = path.join(CHANNELS, data.channel + ".json");
      if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");

      ws.send(JSON.stringify({
        type: "history",
        messages: JSON.parse(fs.readFileSync(file))
      }));

      broadcast({
        type: "users",
        users: usersInChannel(ws.channel)
      });
    }

    /* TEXT MESSAGE */
    if (data.type === "message") {
      const file = path.join(CHANNELS, data.channel + ".json");
      if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");

      const msgs = JSON.parse(fs.readFileSync(file));
      msgs.push(data);
      fs.writeFileSync(file, JSON.stringify(msgs, null, 2));

      broadcast(data);
    }

    /* ===== VOICE ===== */
    if (data.type === "voice-join") {
      const ch = data.channel;
      ws.voice = ch;
      if (!voiceChannels[ch]) voiceChannels[ch] = new Set();
      voiceChannels[ch].add(ws);

      voiceChannels[ch].forEach(c => {
        if (c !== ws) {
          c.send(JSON.stringify({
            type: "voice-user",
            userId: ws.id
          }));
        }
      });
    }

    if (data.type === "voice-leave") {
      const ch = ws.voice;
      if (ch && voiceChannels[ch]) {
        voiceChannels[ch].delete(ws);
        if (!voiceChannels[ch].size) delete voiceChannels[ch];
      }
      ws.voice = null;
    }

    if (
      data.type === "voice-offer" ||
      data.type === "voice-answer" ||
      data.type === "voice-ice"
    ) {
      clients.forEach(c => {
        if (c.id === data.to) {
          c.send(JSON.stringify({ ...data, from: ws.id }));
        }
      });
    }
  });

  ws.on("close",
