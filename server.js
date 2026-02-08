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

/* ===== HTTP SERVER ===== */
const server = http.createServer((req, res) => {

  /* ---- avatar upload ---- */
  if (req.method === "POST" && req.url === "/upload-avatar") {
    upload.single("avatar")(req, res, () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        url: "/avatars/" + req.file.filename
      }));
    });
    return;
  }

  /* ---- static files ---- */
  const safeUrl = req.url === "/" ? "/index.html" : req.url;
  const isAvatar = safeUrl.startsWith("/avatars/");
  const baseDir = isAvatar ? AVATARS : PUBLIC;
  const filePath = path.join(baseDir, safeUrl.replace("/avatars/", ""));

  if (!filePath.startsWith(baseDir)) {
    res.writeHead(403);
    return res.end("Forbidden");
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

/* ===== WEBSOCKET ===== */
const wss = new WebSocket.Server({ server });
const clients = new Set();
const voiceChannels = {}; // { channelName: Set(ws) }

/* ===== HELPERS ===== */
function broadcast(data) {
  const msg = JSON.stringify(data);
  clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(msg);
  });
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
  ws.id = ws._socket.remotePort; // простой peer id
  ws.username = "Guest";
  ws.avatar = "/logo.svg";
  ws.channel = "общий";
  ws.voice = null;

  clients.add(ws);
  broadcast({ type: "online", count: clients.size });

  ws.on("message", raw => {
    let data;
    try { data = JSON.parse(raw); } catch { return; }

    /* ===== TEXT JOIN ===== */
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

    /* ===== TEXT MESSAGE ===== */
    if (data.type === "message") {
      const file = path.join(CHANNELS, data.channel + ".json");
      if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");

      const msgs = JSON.parse(fs.readFileSync(file));
      msgs.push(data);
      fs.writeFileSync(file, JSON.stringify(msgs, null, 2));

      broadcast(data);
    }

    /* ===== VOICE JOIN ===== */
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

    /* ===== VOICE LEAVE ===== */
    if (data.type === "voice-leave") {
      const ch = ws.voice;
      if (ch && voiceChannels[ch]) {
        voiceChannels[ch].delete(ws);
        if (!voiceChannels[ch].size) delete voiceChannels[ch];
      }
      ws.voice = null;
    }

    /* ===== WEBRTC SIGNALING ===== */
    if (
      data.type === "voice-offer" ||
      data.type === "voice-answer" ||
      data.type === "voice-ice"
    ) {
      clients.forEach(c => {
        if (c.id === data.to) {
          c.send(JSON.stringify({
            ...data,
            from: ws.id
          }));
        }
      });
    }
  });

  ws.on("close", () => {
    clients.delete(ws);

    if (ws.voice && voiceChannels[ws.voice]) {
      voiceChannels[ws.voice].delete(ws);
    }

    broadcast({ type: "online", count: clients.size });
    broadcast({
      type: "users",
      users: usersInChannel(ws.channel)
    });
  });
});

/* ===== START ===== */
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log("🚀 FASTMOST running on port", PORT);
});
