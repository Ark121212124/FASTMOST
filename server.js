// ========================================
// FASTMOST FULL PRODUCTION SERVER
// Auth + Email Verify + JWT + Voice + Chat
// ========================================

const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");


// ========================================
// CONFIG
// ========================================

const PUBLIC = path.join(__dirname, "public");
const USERS_FILE = path.join(__dirname, "users.json");

const JWT_SECRET =
process.env.JWT_SECRET || "fastmost_secret_change_this";

if (!fs.existsSync(USERS_FILE))
fs.writeFileSync(USERS_FILE, "[]");


// ========================================
// EMAIL
// ========================================

const transporter =
nodemailer.createTransport({

 service: "gmail",

 auth: {

  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS

 }

});


// ========================================
// HELPERS
// ========================================

function loadUsers(){

 return JSON.parse(
 fs.readFileSync(USERS_FILE)
 );

}

function saveUsers(users){

 fs.writeFileSync(
 USERS_FILE,
 JSON.stringify(users,null,2)
 );

}

function hash(password){

 return crypto
 .createHash("sha256")
 .update(password)
 .digest("hex");

}

function generateCode(){

 return Math.floor(
 100000 + Math.random()*900000
 ).toString();

}

function sendJSON(res,data){

 res.writeHead(200,{
  "Content-Type":"application/json"
 });

 res.end(JSON.stringify(data));

}


// ========================================
// HTTP SERVER
// ========================================

const server =
http.createServer(async (req,res)=>{


 // ================= REGISTER
 if(req.method==="POST"
 && req.url==="/api/register"){

  let body="";

  req.on("data",c=>body+=c);

  req.on("end",async()=>{

   const {name,email,password}=
   JSON.parse(body);

   const users=loadUsers();

   if(users.find(u=>u.email===email)){

    res.writeHead(400);
    return res.end("Email exists");

   }

   const code=generateCode();

   const user={

    id:crypto.randomUUID(),

    name,
    email,

    password:hash(password),

    verified:false,

    verifyCode:code,

    avatar:"/logo.svg"

   };

   users.push(user);

   saveUsers(users);


   await transporter.sendMail({

    from:"FASTMOST",

    to:email,

    subject:"FASTMOST verification",

    html:`
    <h2>FASTMOST</h2>
    <p>Код подтверждения:</p>
    <h1>${code}</h1>
    `

   });

   res.end("OK");

  });

  return;

 }


 // ================= VERIFY
 if(req.method==="POST"
 && req.url==="/api/verify"){

  let body="";

  req.on("data",c=>body+=c);

  req.on("end",()=>{

   const {email,code}=
   JSON.parse(body);

   const users=loadUsers();

   const user=
   users.find(u=>u.email===email);

   if(!user || user.verifyCode!==code){

    res.writeHead(400);
    return res.end("Invalid code");

   }

   user.verified=true;
   user.verifyCode=null;

   saveUsers(users);

   res.end("Verified");

  });

  return;

 }


 // ================= LOGIN
 if(req.method==="POST"
 && req.url==="/api/login"){

  let body="";

  req.on("data",c=>body+=c);

  req.on("end",()=>{

   const {email,password}=
   JSON.parse(body);

   const users=loadUsers();

   const user=
   users.find(u=>
    u.email===email &&
    u.password===hash(password)
   );

   if(!user){

    res.writeHead(401);
    return res.end("Invalid login");

   }

   if(!user.verified){

    res.writeHead(403);
    return res.end("Verify email");

   }

   const token=
   jwt.sign({

    id:user.id,
    email:user.email

   },JWT_SECRET);

   sendJSON(res,{

    token,
    name:user.name,
    avatar:user.avatar

   });

  });

  return;

 }


 // ================= PROFILE
 if(req.method==="GET"
 && req.url==="/api/profile"){

  const token=
  req.headers.authorization;

  if(!token){

   res.writeHead(401);
   return res.end();

  }

  try{

   const data=
   jwt.verify(token,JWT_SECRET);

   const users=loadUsers();

   const user=
   users.find(u=>u.id===data.id);

   sendJSON(res,{

    name:user.name,
    email:user.email,
    avatar:user.avatar

   });

  }catch{

   res.writeHead(401);
   res.end();

  }

  return;

 }


 // ================= STATIC FILES
 let filePath=
 path.join(
 PUBLIC,
 req.url==="/"
 ? "index.html"
 : req.url
 );

 fs.readFile(filePath,(err,data)=>{

  if(err){

   res.writeHead(404);
   return res.end("Not found");

  }

  const ext=
  path.extname(filePath);

  const types={

   ".html":"text/html",
   ".css":"text/css",
   ".js":"application/javascript",
   ".svg":"image/svg+xml"

  };

  res.writeHead(200,{
   "Content-Type":
   types[ext]||"text/plain"
  });

  res.end(data);

 });

});


// ========================================
// WEBSOCKET VOICE SERVER
// ========================================

const wss=
new WebSocket.Server({server});

const clients=
new Map();

function send(ws,data){

 ws.readyState===1 &&
 ws.send(JSON.stringify(data));

}

function broadcastVoice(channel){

 const users=[];

 for(const [id,c] of clients){

  if(c.voice===channel){

   users.push({
    id,
    username:c.username
   });

  }

 }

 for(const c of clients.values()){

  if(c.voice===channel){

   send(c,{
    type:"voice-users",
    users
   });

  }

 }

}


wss.on("connection",ws=>{

 ws.id=crypto.randomUUID();
 ws.username="Guest";
 ws.voice=null;

 clients.set(ws.id,ws);

 send(ws,{
  type:"init",
  id:ws.id
 });

 ws.on("message",raw=>{

  const d=JSON.parse(raw);


  if(d.type==="voice-join"){

   ws.voice=d.channel;
   ws.username=d.user;

   broadcastVoice(ws.voice);

  }


  if(d.type==="voice-leave"){

   const old=ws.voice;
   ws.voice=null;

   if(old)
   broadcastVoice(old);

  }


  if(
   d.type==="voice-offer"||
   d.type==="voice-answer"||
   d.type==="voice-ice"
  ){

   const to=clients.get(d.to);

   if(to){

    send(to,{
     ...d,
     from:ws.id
    });

   }

  }


  if(d.type==="voice-speaking"){

   for(const c of clients.values()){

    if(c.voice===ws.voice){

     send(c,{
      type:"voice-speaking",
      id:ws.id,
      speaking:d.speaking
     });

    }

   }

  }

 });


 ws.on("close",()=>{

  const old=ws.voice;

  clients.delete(ws.id);

  if(old)
  broadcastVoice(old);

 });

});


// ========================================
// START SERVER
// ========================================

server.listen(
process.env.PORT||10000,
()=>console.log("🚀 FASTMOST Production Server Ready")
);
