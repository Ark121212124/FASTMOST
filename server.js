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

/* ===== HELPERS ===== */
const hash = p => crypto.createHash("sha256").update(p).digest("hex");
const makeToken = () => crypto.randomBytes(24).toString("hex");

/* ===== UPLOAD ===== */
const upload = multer({ dest: AVATARS });

/* ===== HTTP SERVER ===== */
const server = http.createServer((req, res) => {
  if (req.method === "POST" && (req.url === "/login" || req.url === "/register")) {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      const { username, password } = JSON.parse(body || "{}");
      const users = JSON.parse(fs.readFileSync(USERS_FILE));

      if (req.url === "/register") {
        if (users.find(u => u.username === username)) {
          res.writeHead(409); return res.end();
        }
        const user = { username, password: hash(password), avatar: "/logo.svg", token: makeToken() };
        users.push(user);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        res.end(JSON.stringify(user));
        return;
      }

      const user = users.find(u => u.username === username && u.password === hash(password));
      if (!user) { res.writeHead(401); return res.end(); }

      user.token = makeToken();
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
      res.end(JSON.stringify(user));
    });
    return;
  }

  if (req.method === "POST" && req.url === "/upload-avatar") {
    upload.single("avatar")(req, res, () => {
      res.end(JSON.stringify({ url: "/avatars/" + req.file.filename }));
    });
    return;
  }

  const safe = req.url === "/" ? "/index.html" : req.url;
  const filePath = safe.startsWith("/avatars/")
    ? path.join(AVATARS, path.basename(safe))
    : path.join(PUBLIC, safe.slice(1));

  fs.readFile(filePath, (e, d) => {
    if (e) { res.writeHead(404); return res.end(); }
    res.end(d);
  });
});

/* ===== WEBSOCKET ===== */
const wss = new WebSocket.Server({ server });
const clients = new Set();

function voiceState() {
  const map = {};
  [...clients].forEach(c => {
    if (c.voice) {
      if (!map[c.voice]) map[c.voice] = [];
      map[c.voice].push({
        username: c.username,
        avatar: c.avatar,
        speaking: c.speaking
      });
    }
  });
  return map;
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  clients.forEach(c => c.readyState === 1 && c.send(msg));
}

wss.on("connection", ws => {
  ws.username = "Guest";
  ws.avatar = "/logo.svg";
  ws.channel = "общий";
  ws.voice = null;
  ws.speaking = false;

  clients.add(ws);
  broadcast({ type: "online", count: clients.size });

  ws.on("message", raw => {
    const d = JSON.parse(raw);

    if (d.type === "join") {
      ws.username = d.user;
      ws.avatar = d.avatar;
      ws.channel = d.channel;
      broadcast({ type: "users", users: [...clients].map(c => ({
        username: c.username,
        avatar: c.avatar,
        speaking: c.speaking
      }))});
    }

    if (d.type === "message") broadcast(d);

    if (d.type === "voice-join") {
      ws.voice = d.channel;
      broadcast({ type: "voice-state", voices: voiceState() });
    }

    if (d.type === "voice-leave") {
      ws.voice = null;
      broadcast({ type: "voice-state", voices: voiceState() });
    }

    if (d.type === "voice-activity") {
      ws.speaking = d.speaking;
      broadcast({ type: "voice-state", voices: voiceState() });
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    broadcast({ type: "voice-state", voices: voiceState() });
  });
});

server.listen(process.env.PORT || 10000);
