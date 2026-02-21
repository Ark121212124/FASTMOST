// ===============================
// FASTMOST FULL SERVER
// Voice + Speaking Indicator FIXED
// ===============================

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const WebSocket = require("ws");

const PUBLIC = path.join(__dirname, "public");


// ===============================
// HTTP SERVER
// ===============================

const server = http.createServer((req, res) => {

 let filePath =
 path.join(PUBLIC, req.url === "/" ? "index.html" : req.url);

 if (!filePath.startsWith(PUBLIC)) {

  res.writeHead(403);
  return res.end();

 }

 fs.readFile(filePath, (err, data) => {

  if (err) {

   res.writeHead(404);
   return res.end("Not found");

  }

  const ext = path.extname(filePath);

  const types = {
   ".html": "text/html",
   ".css": "text/css",
   ".js": "application/javascript",
   ".svg": "image/svg+xml",
   ".png": "image/png"
  };

  res.writeHead(200, {
   "Content-Type": types[ext] || "text/plain"
  });

  res.end(data);

 });

});


// ===============================
// WEBSOCKET SERVER
// ===============================

const wss =
new WebSocket.Server({ server });

const clients =
new Map();


// ===============================
// SEND HELPER
// ===============================

function send(ws, data){

 if(ws.readyState === 1){

  ws.send(JSON.stringify(data));

 }

}


// ===============================
// BROADCAST VOICE USERS
// ===============================

function broadcastVoice(channel){

 const users = [];

 for(const [id, client] of clients){

  if(client.voice === channel){

   users.push({

    id,
    username: client.username

   });

  }

 }

 for(const client of clients.values()){

  if(client.voice === channel){

   send(client,{

    type:"voice-users",
    users

   });

  }

 }

}


// ===============================
// CONNECTION
// ===============================

wss.on("connection", ws => {

 ws.id = crypto.randomUUID();

 ws.username = "Guest";

 ws.voice = null;

 clients.set(ws.id, ws);


 send(ws,{
  type:"init",
  id:ws.id
 });


 ws.on("message", raw => {

  let d;

  try{

   d = JSON.parse(raw);

  }catch{

   return;

  }


  // ===============================
  // JOIN VOICE
  // ===============================

  if(d.type === "voice-join"){

   ws.voice = d.channel;

   ws.username =
   d.user || "Guest";

   broadcastVoice(ws.voice);

  }


  // ===============================
  // LEAVE VOICE
  // ===============================

  if(d.type === "voice-leave"){

   const old = ws.voice;

   ws.voice = null;

   if(old)
   broadcastVoice(old);

  }


  // ===============================
  // WEBRTC SIGNALING
  // ===============================

  if(d.type === "voice-offer" ||
     d.type === "voice-answer" ||
     d.type === "voice-ice"){

   const to =
   clients.get(d.to);

   if(to){

    send(to,{
     type:d.type,
     offer:d.offer,
     answer:d.answer,
     candidate:d.candidate,
     from:ws.id
    });

   }

  }


  // ===============================
  // SPEAKING INDICATOR (FIXED)
  // ===============================

  if(d.type === "voice-speaking"){

   for(const client of clients.values()){

    if(client.voice === ws.voice){

     send(client,{
      type:"voice-speaking",
      id:ws.id,
      speaking:d.speaking
     });

    }

   }

  }


 });


 ws.on("close", () => {

  const old = ws.voice;

  clients.delete(ws.id);

  if(old)
  broadcastVoice(old);

 });

});


// ===============================
// START SERVER
// ===============================

server.listen(
 process.env.PORT || 10000,
 () => console.log("🚀 FASTMOST VOICE READY")
);
