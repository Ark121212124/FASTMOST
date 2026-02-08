const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const multer = require("multer");
const crypto = require("crypto");

/* ===== PATHS ===== */
const PUBLIC = path.join(__dirname, "public");
const USERS_FILE = path.join(__dirname, "users.json");
const AVATARS = path.join(__dirname, "avatars");
const CHANNELS = path.join(__dirname, "channels");

/* ===== INIT ===== */
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");
if (!fs.existsSync(AVATARS)) fs.mkdirSync(AVATARS);
if (!fs.existsSync(CHANNELS)) fs.mkdirSync(CHANNELS);

/* ===== HELPERS ===== */
const loadUsers = () => JSON.parse(fs.readFileSync(USERS_FILE));
const saveUsers = u => fs.writeFileSync(USERS_FILE, JSON.stringify(u, null, 2));
const hash = p => crypto.createHash("sha256").update(p).digest("hex");
const genToken = () => crypto.randomBytes(24).toString("hex");

/* ===== UPLOAD ===== */
const upload = multer({ dest: AVATARS });

/* ===== HTTP SERVER ===== */
const server = http.createServer((req, res) => {

  /* ===== AUTH ===== */
  if (req.method === "POST" && (req.url === "/login" || req.url === "/register")) {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      const { username, password } = JSON.parse(body || "{}");
      const users = loadUsers();

      if (!username || !password) {
        res.writeHead(400);
        return res.end("Bad request");
      }

      if (req.url === "/register") {
        if (users.find(u => u.username === username)) {
          res.writeHead(409);
          return res.end("User exists");
        }

        const user = {
          username,
          password: hash(password),
          token: genToken(),
          avatar: "/logo.svg"
        };

        users.push(user);
        saveUsers(users);

        return res.end(JSON.stringify({
          token: user.token,
          username: user.username,
          avatar: user.avatar
        }));
      }

      const user = users.find(
        u => u.username === username && u.password === hash(password)
      );

      if (!user) {
        res.writeHead(401);
        return res.end("Unauthorized");
      }

      user.token = genToken();
      saveUsers(users);

      res.end(JSON.stringify({
        token: user.token,
        username: user.username,
        avatar: user.avatar
      }));
    });
    return;
  }

  /* ===== AVATAR UPLOAD ===== */
  if (req.method === "POST" && req.url === "/upload-avatar") {
    upload.single("avatar")(req, res, () => {
      res.end(JSON.stringify({ url: "/avatars/" + req.file.filename }));
    });
    return;
  }

  /* ===== STATIC FILES ===== */
  const safeUrl = req.url === "/" ? "/index.html" : req.url;
  const isAvatar = safeUrl.startsWith("/avatars/");
  const base = isAvatar ? AVATARS : PUBLIC;
  const filePath = path.join(base, safeUrl.replace("/avatars/", ""));

  if (!filePath.startsWith(base)) {
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
      ".css": "text/css",
      ".js": "application/javascript",
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
const voiceChannels = {};

const broadcast = data => {
  const msg = JSON.stringify(data);
  clients.forEach(c => c.readyState === 1 && c.send(msg));
};

const usersInChannel = ch =>
  [...clients].filter(c => c.channel === ch).map(c => ({
    username: c.username,
    avatar: c.avatar
  }));

wss.on("connection", ws => {
  ws.id = ws._socket.remotePort;
  ws.username = "Guest";
  ws.avatar = "/logo.svg";
  ws.channel = "общий";
  ws.voice = null;

  clients.add(ws);
  broadcast({ type: "online", count: clients.size });

  ws.on("message", raw => {
    let data;
    try { data = JSON.parse(raw); } catch { return; }

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

      broadcast({ type: "users", users: usersInChannel(ws.channel) });
    }

    if (data.type === "message") {
      const file = path.join(CHANNELS, ws.channel + ".json");
      const msgs = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
      msgs.push(data);
      fs.writeFileSync(file, JSON.stringify(msgs, null, 2));
      broadcast(data);
    }

    if (data.type === "voice-join") {
      if (!voiceChannels[data.channel]) voiceChannels[data.channel] = new Set();
      voiceChannels[data.channel].add(ws);
      ws.voice = data.channel;
    }

    if (data.type === "voice-leave" && ws.voice) {
      voiceChannels[ws.voice]?.delete(ws);
      ws.voice = null;
    }

    if (data.type?.startsWith("voice-")) {
      clients.forEach(c => {
        if (c.id === data.to) {
          c.send(JSON.stringify({ ...data, from: ws.id }));
        }
      });
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    if (ws.voice) voiceChannels[ws.voice]?.delete(ws);
    broadcast({ type: "online", count: clients.size });
  });
});

/* ===== START ===== */
const PORT = process.env.PORT || 10000;
server.listen(PORT, () =>
  console.log("🚀 FASTMOST running on port", PORT)
);
