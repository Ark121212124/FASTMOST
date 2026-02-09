const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const crypto = require("crypto");

/* ================= PATHS ================= */
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const USERS_FILE = path.join(ROOT, "users.json");

/* ================= INIT ================= */
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "[]");
}

/* ================= HELPERS ================= */
const hash = v =>
  crypto.createHash("sha256").update(v).digest("hex");

const makeToken = () =>
  crypto.randomBytes(24).toString("hex");

/* ================= HTTP ================= */
const server = http.createServer((req, res) => {

  /* ===== AUTH ===== */
  if (req.method === "POST" && (req.url === "/login" || req.url === "/register")) {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        res.writeHead(400);
        return res.end("Bad JSON");
      }

      const { username, password } = data;
      if (!username || !password) {
        res.writeHead(400);
        return res.end("Missing fields");
      }

      const users = JSON.parse(fs.readFileSync(USERS_FILE));

      /* REGISTER */
      if (req.url === "/register") {
        if (users.find(u => u.username === username)) {
          res.writeHead(409);
          return res.end("User exists");
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

      /* LOGIN */
      const user = users.find(
        u => u.username === username && u.password === hash(password)
      );

      if (!user) {
        res.writeHead(401);
        return res.end("Invalid credentials");
      }

      user.token = makeToken();
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(user));
    });
    return;
  }

  /* ===== STATIC ===== */
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

/* ================= WEBSOCKET ================= */
const wss = new WebSocket.Server({ server });
const clients = new Map(); // id -> ws

function send(ws, data) {
  ws.readyState === 1 && ws.send(JSON.stringify(data));
}

wss.on("connection", ws => {
  ws.id = crypto.randomUUID();
  ws.username = "Guest";
  ws.channel = "общий";
  ws.voice = null;

  clients.set(ws.id, ws);

  ws.on("message", raw => {
    let d;
    try { d = JSON.parse(raw); } catch { return; }

    /* TEXT JOIN */
    if (d.type === "join") {
      ws.username = d.user;
      ws.channel = d.channel;
      return;
    }

    /* CHAT */
    if (d.type === "message") {
      for (const c of clients.values()) {
        send(c, d);
      }
    }

    /* VOICE JOIN */
    if (d.type === "voice-join") {
      ws.voice = d.channel;

      const users = [];
      for (const [id, c] of clients) {
        if (c.voice === ws.voice && id !== ws.id) {
          users.push({ id, username: c.username });
        }
      }

      send(ws, { type: "voice-users", users });

      for (const [id, c] of clients) {
        if (c.voice === ws.voice && id !== ws.id) {
          send(c, {
            type: "voice-user-joined",
            userId: ws.id,
            username: ws.username
          });
        }
      }
    }

    /* VOICE LEAVE */
    if (d.type === "voice-leave") {
      ws.voice = null;
      for (const c of clients.values()) {
        send(c, { type: "voice-user-left", userId: ws.id });
      }
    }

    /* WEBRTC SIGNAL */
    if (
      d.type === "voice-offer" ||
      d.type === "voice-answer" ||
      d.type === "voice-ice"
    ) {
      const to = clients.get(d.to);
      if (to) send(to, { ...d, from: ws.id });
    }
  });

  ws.on("close", () => {
    clients.delete(ws.id);
    for (const c of clients.values()) {
      send(c, { type: "voice-user-left", userId: ws.id });
    }
  });
});

server.listen(process.env.PORT || 10000, () =>
  console.log("🚀 FASTMOST full server ready")
);
