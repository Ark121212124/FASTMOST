const http=require("http");
const fs=require("fs");
const path=require("path");
const WebSocket=require("ws");
const crypto=require("crypto");


const PUBLIC =
path.join(__dirname,"public");


/* HTTP */
const server=http.createServer((req,res)=>{

 const file =
 req.url === "/"
 ? "/index.html"
 : req.url;

 const filePath =
 path.join(PUBLIC,file);


 fs.readFile(filePath,(err,data)=>{

  if(err){

   res.writeHead(404);

   return res.end();

  }


  const types={

   ".html":"text/html",

   ".css":"text/css",

   ".js":"application/javascript",

   ".svg":"image/svg+xml"

  };


  res.writeHead(200,{

   "Content-Type":
   types[path.extname(filePath)]
   || "text/plain"

  });


  res.end(data);

 });

});


/* WEBSOCKET */
const wss =
new WebSocket.Server({server});


const clients =
new Map();


function send(ws,data){

 if(ws.readyState === 1)
 ws.send(JSON.stringify(data));

}


function broadcastVoice(channel){

 const users=[];

 for(const [id,c] of clients){

  if(c.voice === channel){

   users.push({

    id,

    username:c.username

   });

  }

 }


 for(const c of clients.values()){

  if(c.voice === channel){

   send(c,{

    type:"voice-users",

    users

   });

  }

 }

}


wss.on("connection",ws=>{

 ws.id =
 crypto.randomUUID();

 ws.username =
 "Guest";

 ws.voice =
 null;


 clients.set(ws.id,ws);


 send(ws,{

  type:"init",

  id:ws.id

 });


 ws.on("message",raw=>{

  const d =
  JSON.parse(raw);


  if(d.type === "voice-join"){

   ws.voice =
   d.channel;

   ws.username =
   d.user || "Guest";


   broadcastVoice(ws.voice);

  }


  if(d.type === "voice-leave"){

   const old =
   ws.voice;

   ws.voice =
   null;

   if(old)
   broadcastVoice(old);

  }


  if(

   d.type === "voice-offer" ||

   d.type === "voice-answer" ||

   d.type === "voice-ice"

  ){

   const to =
   clients.get(d.to);

   if(to){

    send(to,{

     ...d,

     from:ws.id

    });

   }

  }

 });


 ws.on("close",()=>{

  const old =
  ws.voice;

  clients.delete(ws.id);

  if(old)
  broadcastVoice(old);

 });

});


server.listen(

 process.env.PORT || 10000,

 ()=>console.log("🚀 FASTMOST Voice Ready")

);
