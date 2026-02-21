const voiceRooms = {};

function broadcastVoice(channel){

 const users =
 voiceRooms[channel] || [];

 for(const ws of clients.values()){

  if(ws.voice === channel){

   send(ws,{
    type:"voice-users",
    users
   });

  }

 }

}


if(d.type === "voice-join"){

 ws.voice = d.channel;

 ws.username = d.user;

 if(!voiceRooms[d.channel])
 voiceRooms[d.channel] = [];

 voiceRooms[d.channel]
 .push({
  id:ws.id,
  username:ws.username
 });

 broadcastVoice(d.channel);

}


if(d.type === "voice-leave"){

 const room =
 voiceRooms[ws.voice];

 if(room){

  voiceRooms[ws.voice] =
  room.filter(u => u.id !== ws.id);

 }

 broadcastVoice(ws.voice);

 ws.voice = null;

}
