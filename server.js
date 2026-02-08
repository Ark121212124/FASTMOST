const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const multer = require("multer");

const PUBLIC = path.join(__dirname, "public");
const USERS_FILE = path.join(__dirname, "users.json");
const AVATARS = path.join(__dirname, "avatars");
const CHANNELS = path.join(__dirname, "channels");

if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");
if (!fs.existsSync(AVATARS)) fs.mkdirSync(AVATARS);
if (!fs.existsSync(CHANNELS)) fs.mkdirSync(CHANNELS);

const upload = multer({ dest: AVATARS });

/* ===== HTTP ===== */
const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/upload-avatar") {
    upload.single("avatar")(req, res, () => {
      res.end(JSON.stringify({ url: "/avatars/" + req.file.filename }));
    });
    return;
  }

  const safe = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(__dirname, safe.startsWith("/avatars")
    ? safe
    : "public" + safe
  );

  if (!filePath.startsWith(PUBLIC) && !filePath.startsWith(AVATARS)) {
    res.writeHead(403);
    return res.end();
  }

  fs.readFile(filePath, (err, data) => {
    if (err) return res.end();
    res.end(data);
  });
});

/* ===== WS ===== */
const wss = new WebSocket.Server({ server });
const clients = new Set();

function usersInChannel(channel) {
  return [...clients]
    .filter(c => c.channel === channel)
    .map(c => ({
      username: c.username,
      avatar: c.avatar
    }));
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  clients.forEach(c => c.readyState === 1 && c.send(msg));
}

wss.on("connection", ws => {
  ws.username = "Guest";
  ws.avatar = "/logo.svg";
  ws.channel = "общий";
  clients.add(ws);

  broadcast({ type: "online", count: clients.size });

  ws.on("message", raw => {
    const data = JSON.parse(raw);

    if (data.type === "join") {
      ws.username = data.user;
      ws.avatar = data.avatar || ws.avatar;
      ws.channel = data.channel;

      ws.send(JSON.stringify({
        type: "users",
        users: usersInChannel(ws.channel)
      }));

      broadcast({
        type: "users",
        users: usersInChannel(ws.channel)
      });
    }

    if (data.type === "message") {
      const file = path.join(CHANNELS, data.channel + ".json");
      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify([]));
      }

      const messages = JSON.parse(fs.readFileSync(file));
      messages.push(data);
      fs.writeFileSync(file, JSON.stringify(messages, null, 2));

      broadcast(data);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    broadcast({ type: "online", count: clients.size });
    broadcast({
      type: "users",
      users: usersInChannel(ws.channel)
    });
  });
});

server.listen(process.env.PORT || 10000);
