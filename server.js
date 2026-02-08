const http = require("http");
const fs = require("fs");
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

  // AUTH
  if (req.method === "POST" && ["/login","/register"].includes(req.url)) {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      const { username, password } = JSON.parse(body);
      const users = loadUsers();

      if (req.url === "/register") {
        if (users.find(u => u.username === username)) {
          res.writeHead(400); return res.end();
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

  // FILE UPLOAD
  if (req.method === "POST" && req.url === "/upload") {
    upload.single("file")(req, res, () => {
      const name = req.file.filename + "-" + req.file.originalname;
      fs.renameSync(req.file.path, "uploads/" + name);

      broadcast({
        type: "file",
        user: req.headers["x-user"],
        name: req.file.originalname,
        url: "/uploads/" + name
      });

      res.end("ok");
    });
    return;
  }

  // STATIC
  const filePath =
    req.url.startsWith("/uploads")
      ? "." + req.url
      : "./public" + (req.url === "/" ? "/index.html" : req.url);

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

function broadcast(data) {
  sockets.forEach(s => s.send(JSON.stringify(data)));
}

wss.on("connection", ws => {
  sockets.push(ws);

  ws.on("message", msg => {
    const data = JSON.parse(msg);
    broadcast(data);
  });

  ws.on("close", () => {
    sockets = sockets.filter(s => s !== ws);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log("🚀 FASTMOST running on port", PORT)
);
