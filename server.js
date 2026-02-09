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

  /* ===== AUTH ===== */
  if (req.method === "POST" && (req.url === "/login" || req.url === "/register")) {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      let data;
      try { data = JSON.parse(body); } catch {
        res.writeHead(400); return res.end("Bad JSON");
      }

      const { username, password } = data;
      if (!username || !password) {
        res.writeHead(400); return res.end("Missing fields");
      }

      const users = JSON.parse(fs.readFileSync(USERS_FILE));

      if (req.url === "/register") {
        if (users.find(u => u.username === username)) {
          res.writeHead(409); return res.end("User exists");
        }

        const user = {
          username,
          password: hash(password),
          avatar: "/logo.svg",
          token: makeToken()
        };

        users.push(user);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(user));
      }

      const user = users.find(
        u => u.username === username && u.password === hash(password)
      );

      if (!user) {
        res.writeHead(401); return res.end("Invalid credentials");
      }

      user.token = makeToken();
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(user));
    });
    return;
  }

  /* ===== AVATAR UPLOAD ===== */
  if (req.method === "POST" && req.url === "/upload-avatar") {
    upload.single("avatar")(req, res, () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ url: "/avatars/" + req.file.filename }));
    });
    return;
  }

  /* ===== STATIC FILES ===== */
  const safe = req.url === "/" ? "/index.html" : req.url;

  if (safe.startsWith("/avatars/")) {
    const p = path.join(AVATARS, path.basename(safe));
    if (!p.startsWith(AVATARS)) { res.writeHead(403); return res.end(); }
    return fs.readFile(p, (e, d) => {
      if (e) { res.writeHead(404); return res.end(); }
      res.end(d);
    });
  }

  const filePath = path.join(PUBLIC, safe.slice(1));
  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403); return res.end();
  }

  fs.readFile(filePath, (e, d) => {
    if (e) { res.writeHead(404); return res.end(); }

    const types = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg"
    };

    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "application/octet-stream"
    });
    res.end(d);
  });
});

/* ===== WEBSOCKET ===== */
const wss = new WebSocket.Server({ server });
const clients = new Set();

function broadcast(data) {
  const msg = JSON.stringify(data);
  clients.forEach(c => c.readyState === 1 && c.send(msg));
}

wss.on("connection", ws => {
  ws.username = "Guest";
  ws.avatar = "/logo.svg";
  ws.channel = "общий";
  ws.speaking = false;

  clients.add(ws);
  broadcast({ type: "online", count: clients.size });

  ws.on("message", raw => {
    let d;
    try { d = JSON.parse(raw); } catch { return; }

    if (d.type === "join") {
      ws.username = d.user;
      ws.avatar = d.avatar || ws.avatar;
      ws.channel = d.channel;

      const f = path.join(CHANNELS, ws.channel + ".json");
      if (!fs.existsSync(f)) fs.writeFileSync(f, "[]");

      ws.send(JSON.stringify({
        type: "history",
        messages: JSON.parse(fs.readFileSync(f))
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

    if (d.type === "message") {
      const f = path.join(CHANNELS, ws.channel + ".json");
      const msgs = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : [];
      msgs.push(d);
      fs.writeFileSync(f, JSON.stringify(msgs, null, 2));
      broadcast(d);
    }

    if (d.type === "voice-activity") {
      ws.speaking = d.speaking;
      broadcast({
        type: "voice-activity",
        user: ws.username,
        speaking: d.speaking
      });
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    broadcast({ type: "online", count: clients.size });
  });
});

/* ===== START ===== */
server.listen(process.env.PORT || 10000, () =>
  console.log("🚀 FASTMOST running")
);
