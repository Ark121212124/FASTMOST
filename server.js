// ===============================
// FASTMOST FULL SERVER
// AUTH + VOICE + SPEAKING
// ===============================

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const WebSocket = require("ws");

const PUBLIC = path.join(__dirname, "public");
const USERS_FILE = path.join(__dirname, "users.json");

if (!fs.existsSync(USERS_FILE))
 fs.writeFileSync(USERS_FILE,"[]");


// ===============================
// USER HELPERS
// ===============================

function readUsers(){

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

function generateToken(){

 return crypto
 .randomBytes(32)
 .toString("hex");

}

function sendJSON(res,data){

 res.writeHead(200,{
  "Content-Type":"application/json"
 });

 res.end(JSON.stringify(data));

}


// ===============================
// HTTP SERVER
// ===============================

const server =
http.createServer((req,res)=>{


 // ===============================
 // REGISTER
 // ===============================

 if(req.url==="/api/register"
 && req.method==="POST"){

  let body="";

  req.on("data",c=>body+=c);

  req.on("end",()=>{

   const {
    name,
    email,
    password
   } = JSON.parse(body);

   const users =
   readUsers();

   if(users.find(
    u=>u.email===email
   )){

    return sendJSON(res,{
     error:"Email уже используется"
    });

   }

   const code =
   generateCode();

   users.push({

    id:crypto.randomUUID(),

    name,

    email,

    password:hash(password),

    verified:false,

    code,

    token:null

   });

   saveUsers(users);

   sendJSON(res,{
    success:true,
    code
   });

  });

  return;

 }


 // ===============================
 // VERIFY
 // ===============================

 if(req.url==="/api/verify"
 && req.method==="POST"){

  let body="";

  req.on("data",c=>body+=c);

  req.on("end",()=>{

   const {
    email,
    code
   } = JSON.parse(body);

   const users =
   readUsers();

   const user =
   users.find(
    u=>u.email===email
   );

   if(!user)
   return sendJSON(res,{
    error:"User not found"
   });

   if(user.code!==code)
   return sendJSON(res,{
    error:"Неверный код"
   });

   user.verified=true;

   user.code=null;

   user.token=
   generateToken();

   saveUsers(users);

   sendJSON(res,{
    success:true,
    token:user.token,
    name:user.name
   });

  });

  return;

 }


 // ===============================
 // LOGIN
 // ===============================

 if(req.url==="/api/login"
 && req.method==="POST"){

  let body="";

  req.on("data",c=>body+=c);

  req.on("end",()=>{

   const {
    email,
    password
   } = JSON.parse(body);

   const users =
   readUsers();

   const user =
   users.find(u=>
    u.email===email &&
    u.password===hash(password)
   );

   if(!user)
   return sendJSON(res,{
    error:"Неверные данные"
   });

   if(!user.verified)
   return sendJSON(res,{
    error:"Подтвердите email"
   });

   user.token=
   generateToken();

   saveUsers(users);

   sendJSON(res,{
    success:true,
    token:user.token,
    name:user.name
   });

  });

  return;

 }


 // ===============================
 // STATIC FILES
 // ===============================

 let filePath =
 path.join(
  PUBLIC,
  req.url==="/"
  ? "auth.html"
  : req.url
 );

 if(!filePath.startsWith(PUBLIC)){

  res.writeHead(403);
  return res.end();

 }

 fs.readFile(filePath,
 (err,data)=>{

  if(err){

   res.writeHead(404);
   return res.end();

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
   types[ext]||
   "text/plain"
  });

  res.end(data);

 });

});


// ===============================
// VOICE SERVER
// ===============================

const wss =
new WebSocket.Server({server});

const clients =
new Map();


function send(ws,data){

 if(ws.readyState===1)
 ws.send(JSON.stringify(data));

}


function broadcastVoice(channel){

 const users=[];

 for(const [id,c]
 of clients){

  if(c.voice===channel){

   users.push({
    id,
    username:c.username
   });

  }

 }

 for(const c
 of clients.values()){

  if(c.voice===channel){

   send(c,{
    type:"voice-users",
    users
   });

  }

 }

}


wss.on("connection",ws=>{

 ws.id=
 crypto.randomUUID();

 ws.voice=null;

 ws.username="Guest";

 clients.set(ws.id,ws);

 send(ws,{
  type:"init",
  id:ws.id
 });


 ws.on("message",raw=>{

  const d=
  JSON.parse(raw);


  if(d.type==="voice-join"){

   ws.voice=d.channel;

   ws.username=d.user;

   broadcastVoice(ws.voice);

  }


  if(d.type==="voice-leave"){

   const old=
   ws.voice;

   ws.voice=null;

   if(old)
   broadcastVoice(old);

  }


  if(
   d.type==="voice-offer"||
   d.type==="voice-answer"||
   d.type==="voice-ice"
  ){

   const to=
   clients.get(d.to);

   if(to)
   send(to,{
    ...d,
    from:ws.id
   });

  }


  if(d.type==="voice-speaking"){

   for(const c
   of clients.values()){

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

  const old=
  ws.voice;

  clients.delete(ws.id);

  if(old)
  broadcastVoice(old);

 });

});


server.listen(
process.env.PORT||10000,
()=>console.log(
"FASTMOST FULL READY"
));
