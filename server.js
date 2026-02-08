const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const multer = require("multer");
const crypto = require("crypto");

const PUBLIC = path.join(__dirname, "public");
const USERS_FILE = path.join(__dirname, "users.json");
const AVATARS = path.join(__dirname, "avatars");
const CHANNELS = path.join(__dirname, "channels");

if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");
if (!fs.existsSync(AVATARS)) fs.mkdirSync(AVATARS);
if (!fs.existsSync(CHANNELS)) fs.mkdirSync(CHANNELS);

const upload = multer({ dest: AVATARS });

const server = http.createServer((req, res) => {
  const safe = req.url === "/" ? "/index.html" : req.url;
  const base = safe.startsWith("/avatars") ? AVATARS : PUBLIC;
  const filePath = path.join(base, safe.replace("/avatars/", ""));

  if (!filePath.startsWith(base)) {
    res.writeHead(403); return res.end();
  }

  fs.readFile(filePath, (e, d) => {
    if (e) { res.writeHead(404); return res.end(); }
    res.end(d);
  });
});

const wss = new WebSocket.Server({ server });
const clients = new Set();

function broadcast(data) {
  const msg = JSON.stringify(data);
  clients.forEach(c => c.readyState === 1 && c.send(msg));
}

wss.on("connection", ws => {
  ws.id = ws._socket.remotePort;
  ws.username = "Guest";
  ws.avatar = "/logo.svg";
  ws.channel = "общий";
  ws.speaking = false;

  clients.add(ws);
  broadcast({ type: "online", count: clients.size });

  ws.on("message", raw => {
    let data;
    try { data = JSON.parse(raw); } catch { return; }

    if (data.type === "join") {
      ws.username = data.user;
      ws.avatar = data.avatar;
      ws.channel = data.channel;

      const file = path.join(CHANNELS, ws.channel + ".json");
      if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");

      ws.send(JSON.stringify({
        type: "history",
        messages: JSON.parse(fs.readFileSync(file))
      }));

      broadcast({
        type: "users",
        users: [...clients].map(c => ({
          username: c.username,
          avatar: c.avatar,
          speaking: c.speaking
        }))
      });
    }

    if (data.type === "message") {
      const file = path.join(CHANNELS, ws.channel + ".json");
      const msgs = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
      msgs.push(data);
      fs.writeFileSync(file, JSON.stringify(msgs, null, 2));
      broadcast(data);
    }

    if (data.type === "voice-activity") {
      ws.speaking = data.speaking;
      broadcast({
        type: "voice-activity",
        user: ws.username,
        speaking: data.speaking
      });
    }

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

server.listen(process.env.PORT || 10000);
