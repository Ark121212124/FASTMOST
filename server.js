const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const crypto = require("crypto");
const multer = require("multer");

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("users.json")) fs.writeFileSync("users.json", "[]");

const upload = multer({ dest: "uploads/" });

function loadUsers() {
  return JSON.parse(fs.readFileSync("users.json"));
}
function saveUsers(u) {
  fs.writeFileSync("users.json", JSON.stringify(u, null, 2));
}
function hash(p) {
  return crypto.createHash("sha256").update(p).digest("hex");
}
function token() {
  return crypto.randomBytes(32).toString("hex");
}

const server = http.createServer((req, res) => {

  // ===== AUTH =====
  if (req.method === "POST" && ["/login","/register"].includes(req.url)) {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      const { username, password } = JSON.parse(body);
      const users = loadUsers();

      if (req.url === "/register") {
        if (users.find(u => u.username === username)) {
          res.writeHead(400);
          return res.end();
        }
        const t = token();
        users.push({
          username,
          password: hash(password),
          token: t
        });
        saveUsers(users);
        return res.end(JSON.stringify({ token: t, username }));
      }

      const user = users.find(
        u => u.username === username && u.password === hash(password)
      );

      if (!user) {
        res.writeHead(401);
        return res.end();
      }

      user.token = token();
      saveUsers(users);

      res.end(JSON.stringify({ token: user.token, username }));
    });
    return;
  }

  // ===== FILE UPLOAD =====
  if (req.method === "POST" && req.url === "/upload") {
    upload.single("file")(req, res, () => {
      const name = req.file.filename + "-" + req.file.originalname;
      fs.renameSync(req.file.path, path.join("uploads", name));

      broadcast({
        type: "file",
        user: req.headers["x-user"] || "unknown",
        name: req.file.originalname,
        url: "/uploads/" + name,
        time: new Date().toLocaleTimeString().slice(0,5)
      });

      res.end("ok");
    });
    return;
  }

  // ===== STATIC =====
  let filePath;

  if (req.url.startsWith("/uploads/")) {
    filePath = path.join(__dirname, req.url);
  } else {
    filePath = path.join(
      __dirname,
      "public",
      req.url === "/" ? "index.html" : req.url
    );
  }

  if (
    !filePath.startsWith(path.join(__dirname, "public")) &&
    !filePath.startsWith(path.join(__dirname, "uploads"))
  ) {
    res.writeHead(403);
    return res.end();
  }

  const ext = path.extname(filePath);
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css",
    ".js": "application/javascript",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".json": "application/json"
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end();
    } else {
      res.writeHead(200, {
        "Content-Type": types[ext] || "application/octet-stream"
      });
      res.end(data);
    }
  });
});

// ===== WEBSOCKET =====
const wss = new WebSocket.Server({ server });
let sockets = [];

function broadcast(data) {
  sockets.forEach(s => s.readyState === 1 && s.send(JSON.stringify(data)));
}

wss.on("connection", ws => {
  sockets.push(ws);

  broadcast({ type: "online", count: sockets.length });

  ws.on("message", msg => {
    const data = JSON.parse(msg);
    broadcast(data);
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
