let localStream = null;
let currentVoice = null;
let myId = null;

const peers = {};

const RTC_CONFIG = {
 iceServers: [
  { urls: "stun:stun.l.google.com:19302" }
 ]
};


/* ================= WS ================= */

const ws = new WebSocket(
 location.protocol === "https:"
 ? "wss://" + location.host
 : "ws://" + location.host
);


function wsSend(data){

 if(ws.readyState === 1)
 ws.send(JSON.stringify(data));

}


/* ================= JOIN ================= */

async function joinVoice(channel){

 if(currentVoice === channel) return;

 leaveVoice();

 currentVoice = channel;

 document
 .getElementById("voiceOverlay")
 .classList.remove("hidden");

 document
 .getElementById("voiceChannelName")
 .textContent = channel;


 try{

  localStream =
  await navigator.mediaDevices.getUserMedia({
   audio:{
    echoCancellation:true,
    noiseSuppression:true,
    autoGainControl:true
   }
  });

 }catch(e){

  alert("Нет доступа к микрофону");

  return;

 }


 wsSend({

  type:"voice-join",

  channel,

  user:localStorage.getItem("username") || "Guest"

 });

}


/* ================= LEAVE ================= */

function leaveVoice(){

 if(!currentVoice) return;

 wsSend({type:"voice-leave"});


 Object.values(peers)
 .forEach(pc=>pc.close());

 for(const id in peers)
 delete peers[id];


 localStream
 ?.getTracks()
 .forEach(track=>track.stop());


 document
 .getElementById("voiceOverlay")
 .classList.add("hidden");


 document
 .getElementById("voiceUsers")
 .innerHTML = "";


 currentVoice = null;

}


/* ================= PEER ================= */

function createPeer(id){

 if(id === myId) return;

 if(peers[id]) return peers[id];


 const pc =
 new RTCPeerConnection(RTC_CONFIG);


 peers[id] = pc;


 localStream.getTracks()
 .forEach(track=>{

  pc.addTrack(track, localStream);

 });


 pc.ontrack = e => {

  let audio =
  document.getElementById("audio-"+id);


  if(!audio){

   audio =
   document.createElement("audio");

   audio.id = "audio-"+id;

   audio.autoplay = true;

   document.body.appendChild(audio);

  }

  audio.srcObject = e.streams[0];

 };


 pc.onicecandidate = e => {

  if(e.candidate){

   wsSend({

    type:"voice-ice",

    to:id,

    candidate:e.candidate

   });

  }

 };


 return pc;

}


/* ================= UI ================= */

function renderVoiceUsers(users){

 const container =
 document.getElementById("voiceUsers");

 container.innerHTML = "";


 users.forEach(user=>{

  const div =
  document.createElement("div");

  div.className = "voice-user";


  if(user.id === myId){

   div.style.color = "#22c55e";

   div.style.fontWeight = "bold";

   div.innerHTML = `
   <img src="/logo.svg">
   ${user.username} (Вы)
   `;

  }else{

   div.innerHTML = `
   <img src="/logo.svg">
   ${user.username}
   `;

  }

  container.appendChild(div);

 });

}


/* ================= SIGNALING ================= */

ws.onmessage = async e => {

 const d = JSON.parse(e.data);


 /* INIT */
 if(d.type === "init"){

  myId = d.id;

 }


 /* USER LIST */
 if(d.type === "voice-users"){

  renderVoiceUsers(d.users);


  for(const u of d.users){

   if(u.id === myId) continue;

   const pc = createPeer(u.id);

   const offer =
   await pc.createOffer();

   await pc.setLocalDescription(offer);

   wsSend({

    type:"voice-offer",

    to:u.id,

    offer

   });

  }

 }


 /* OFFER */
 if(d.type === "voice-offer"){

  const pc =
  createPeer(d.from);

  await pc
  .setRemoteDescription(d.offer);


  const answer =
  await pc.createAnswer();

  await pc
  .setLocalDescription(answer);


  wsSend({

   type:"voice-answer",

   to:d.from,

   answer

  });

 }


 /* ANSWER */
 if(d.type === "voice-answer"){

  await peers[d.from]
  ?.setRemoteDescription(d.answer);

 }


 /* ICE */
 if(d.type === "voice-ice"){

  await peers[d.from]
  ?.addIceCandidate(d.candidate);

 }


 /* LEFT */
 if(d.type === "voice-user-left"){

  peers[d.userId]
  ?.close();

  delete peers[d.userId];


  document
  .getElementById("audio-"+d.userId)
  ?.remove();

 }

};
