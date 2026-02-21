if(d.type === "voice-join"){

 ws.voice = d.channel;

 ws.username = d.user;

 const users = [];

 for(const client of clients.values()){

  if(client.voice === d.channel){

   users.push({
    username:client.username
   });

  }

 }

 for(const client of clients.values()){

  if(client.voice === d.channel){

   send(client,{
    type:"voice-users",
    users
   });

  }

 }

}


if(d.type === "voice-leave"){

 ws.voice = null;

}
