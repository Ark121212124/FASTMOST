const http=require("http");
const fs=require("fs");
const path=require("path");
const WebSocket=require("ws");
const crypto=require("crypto");


const PUBLIC=path.join(__dirname,"public");

const server=http.createServer((req,res)=>{

 const file=
 req.url==="/"
 ?"/index.html"
 :req.url;

 const filePath=
 path.join(PUBLIC,file);

 fs.readFile(filePath,(e,data)=>{

  if(e){

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
   types[ext]||"text/plain"
  });

  res.end(data);

 });

});


/* WEBSOCKET */
const wss=
new WebSocket.Server({server});


const clients=new Map();


function send(ws,data){

 if(ws.readyState===1)
 ws.send(JSON.stringify(data));

}


wss.on("connection",ws=>{

 ws.id=crypto.randomUUID();

 ws.username="Guest";

 ws.voice=null;

 clients.set(ws.id,ws);


 ws.on("message",raw=>{

  const d=JSON.parse(raw);


  if(d.type==="voice-join"){

   ws.voice=d.channel;

   ws.username=d.user;


   const users=[];

   for(const [id,c] of clients){

    if(c.voice===ws.voice){

     users.push({
      id,
      username:c.username
     });

    }

   }


   send(ws,{
    type:"voice-users",
    users
   });


   for(const c of clients.values()){

    if(c.voice===ws.voice){

     send(c,{
      type:"voice-user-joined",
      users
     });

    }

   }

  }


  if(d.type==="voice-leave"){

   ws.voice=null;

   for(const c of clients.values()){

    send(c,{
     type:"voice-user-left",
     userId:ws.id
    });

   }

  }


  if(
   d.type==="voice-offer"||
   d.type==="voice-answer"||
   d.type==="voice-ice"
  ){

   const to=
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

  clients.delete(ws.id);

 });

});


server.listen(
 process.env.PORT||10000,
 ()=>console.log("FASTMOST Voice Ready")
);
