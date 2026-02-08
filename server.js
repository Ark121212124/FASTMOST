const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PUBLIC = path.join(__dirname, "public");
const MSG_FILE = path.join(__dirname, "messages.json");

if (!fs.existsSync(MSG_FILE)) {
  fs.writeFileSync(MSG_FILE, JSON.stringify({}));
}

/* ===== HTTP ===== */
const server = http.createServer((req, res) => {
  const safePath = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(PUBLIC, safePath);

  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403);
    return res.end();
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
    } else {
      res.end(data);
    }
  });
});

/* ===== WEBSOCKET ===== */
const wss = new WebSocket.Server({ server });

let clients = new Set();

/* ===== HELPERS ===== */
function loadMessages() {
  return JSON.parse(fs.readFileSync(MSG_FILE, "utf8"));
}

function saveMessages(data) {
  fs.writeFileSync(MSG_FILE, JSON.stringify(data, null, 2));
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

function usersInChannel(channel) {
  return [...clients]
    .filter(c => c.channel === channel)
    .map(c => c.username);
}

/* ===== CONNECTION ===== */
wss.on("connection", ws => {
  ws.username = "Guest";
  ws.channel = "общий";
  clients.add(ws);

  // онлайн
  broadcast({ type: "online", count: clients.size });

  // отправляем историю
  const history = loadMessages();
  ws.send(JSON.stringify({
    type: "history",
    messages: history[ws.channel] || []
  }));

  // пользователи
  ws.send(JSON.stringify({
    type: "users",
    users: usersInChannel(ws.channel)
  }));

  ws.on("message", raw => {
    const data = JSON.parse(raw);

    /* ===== MESSAGE ===== */
    if (data.type === "message") {
      const store = loadMessages();
      if (!store[data.channel]) store[data.channel] = [];

      store[data.channel].push(data);
      saveMessages(store);

      broadcast(data);
    }

    /* ===== JOIN CHANNEL ===== */
    if (data.type === "join") {
      ws.channel = data.channel;
      ws.username = data.user;

      const store = loadMessages();

      ws.send(JSON.stringify({
        type: "history",
        messages: store[data.channel] || []
      }));

      broadcast({
        type: "users",
        users: usersInChannel(data.channel)
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
server.listen(PORT, () =>
  console.log("🚀 FASTMOST running on port", PORT)
);
