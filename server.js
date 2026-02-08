const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
  const filePath = path.join(
    __dirname,
    "public",
    req.url === "/" ? "index.html" : req.url
  );

  if (!filePath.startsWith(path.join(__dirname, "public"))) {
    res.writeHead(403);
    return res.end();
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end();
    } else {
      res.end(data);
    }
  });
});

const wss = new WebSocket.Server({ server });
let sockets = [];

/* 🔹 ХРАНИЛИЩЕ СООБЩЕНИЙ */
const messagesByChannel = {
  "общий": []
};

function broadcast(data) {
  sockets.forEach(s =>
    s.readyState === WebSocket.OPEN &&
    s.send(JSON.stringify(data))
  );
}

wss.on("connection", ws => {
  sockets.push(ws);

  // 🔹 отправляем онлайн
  broadcast({ type: "online", count: sockets.length });

  // 🔹 отправляем историю канала "общий"
  ws.send(JSON.stringify({
    type: "history",
    channel: "общий",
    messages: messagesByChannel["общий"]
  }));

  ws.on("message", msg => {
    const data = JSON.parse(msg);

    if (data.type === "message") {
      if (!messagesByChannel[data.channel]) {
        messagesByChannel[data.channel] = [];
      }

      messagesByChannel[data.channel].push(data);
      broadcast(data);
    }
  });

  ws.on("close", () => {
    sockets = sockets.filter(s => s !== ws);
    broadcast({ type: "online", count: sockets.length });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log("🚀 FASTMOST running on port", PORT)
);
