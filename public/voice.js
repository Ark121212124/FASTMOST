// ==========================
// FASTMOST VOICE SYSTEM FINAL (FREE TURN)
// ==========================

let localStream = null;
let currentVoice = null;
let myId = null;

const peers = {};

let speakingState = false;


// ==========================
// FREE TURN + STUN SERVERS
// ==========================

const RTC_CONFIG = {

 iceServers: [

  {
   urls: "stun:stun.l.google.com:19302"
  },

  {
   urls: "stun:openrelay.metered.ca:80"
  },

  {
   urls: "turn:openrelay.metered.ca:80",
   username: "openrelayproject",
   credential: "openrelayproject"
  },

  {
   urls: "turn:openrelay.metered.ca:443",
   username: "openrelayproject",
   credential: "openrelayproject"
  },

  {
   urls: "turn:openrelay.metered.ca:443?transport=tcp",
   username: "openrelayproject",
   credential: "openrelayproject"
  }

 ]

};


// ==========================
// JOIN VOICE
// ==========================

window.joinVoice = async function(channel){

 if(currentVoice === channel)
 return;

 currentVoice = channel;

 document.getElementById("voiceOverlay")
 .classList.remove("hidden");

 document.getElementById("voiceChannelName")
 .innerText = channel;


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


 startSpeakingDetection(localStream);


 ws.send(JSON.stringify({

  type:"voice-join",

  channel,

  user:localStorage.getItem("username")

 }));

};


// ==========================
// LEAVE VOICE
// ==========================

window.leaveVoice = function(){

 ws.send(JSON.stringify({
  type:"voice-leave"
 }));


 Object.values(peers)
 .forEach(pc=>pc.close());

 for(const id in peers)
 delete peers[id];


 if(localStream){

  localStream.getTracks()
  .forEach(track=>track.stop());

 }


 document.getElementById("voiceOverlay")
 .classList.add("hidden");

};


// ==========================
// CREATE PEER
// ==========================

function createPeer(id){

 if(peers[id])
 return peers[id];


 const pc =
 new RTCPeerConnection(RTC_CONFIG);

 peers[id] = pc;


 // SEND AUDIO
 localStream.getTracks()
 .forEach(track=>{

  pc.addTrack(track, localStream);

 });


 // RECEIVE AUDIO
 pc.ontrack = event => {

  let audio =
  document.getElementById("audio-"+id);

  if(!audio){

   audio =
   document.createElement("audio");

   audio.id =
   "audio-"+id;

   audio.autoplay = true;

   audio.playsInline = true;

   document.body.appendChild(audio);

  }

  audio.srcObject =
  event.streams[0];

 };


 // ICE
 pc.onicecandidate = event => {

  if(event.candidate){

   ws.send(JSON.stringify({

    type:"voice-ice",

    to:id,

    candidate:event.candidate

   }));

  }

 };


 return pc;

}


// ==========================
// SPEAK DETECTION
// ==========================

function startSpeakingDetection(stream){

 const ctx =
 new AudioContext();

 const mic =
 ctx.createMediaStreamSource(stream);

 const analyser =
 ctx.createAnalyser();

 analyser.fftSize = 512;

 mic.connect(analyser);

 const data =
 new Uint8Array(analyser.frequencyBinCount);


 function detect(){

  analyser.getByteFrequencyData(data);

  let volume = 0;

  for(let i=0;i<data.length;i++)
  volume += data[i];

  volume /= data.length;


  const speaking =
  volume > 20;


  if(speaking !== speakingState){

   speakingState = speaking;

   ws.send(JSON.stringify({

    type:"voice-speaking",

    speaking

   }));

  }


  requestAnimationFrame(detect);

 }


 detect();

}


// ==========================
// RENDER USERS
// ==========================

function renderVoiceUsers(users){

 const container =
 document.getElementById("voiceUsers");

 container.innerHTML = "";


 users.forEach(user=>{

  const div =
  document.createElement("div");

  div.className =
  "voice-user";

  div.id =
  "voice-user-"+user.id;

  div.innerText =
  "🎤 "+user.username;


  container.appendChild(div);

 });

}


// ==========================
// WS EVENTS
// ==========================

ws.onmessage = async event => {

 const d =
 JSON.parse(event.data);


 // INIT
 if(d.type==="init")
 myId = d.id;


 // USERS LIST
 if(d.type==="voice-users"){

  renderVoiceUsers(d.users);


  for(const user of d.users){

   if(user.id===myId)
   continue;


   const pc =
   createPeer(user.id);


   const offer =
   await pc.createOffer();


   await pc.setLocalDescription(offer);


   ws.send(JSON.stringify({

    type:"voice-offer",

    to:user.id,

    offer

   }));

  }

 }


 // OFFER
 if(d.type==="voice-offer"){

  const pc =
  createPeer(d.from);


  await pc.setRemoteDescription(
   new RTCSessionDescription(d.offer)
  );


  const answer =
  await pc.createAnswer();


  await pc.setLocalDescription(answer);


  ws.send(JSON.stringify({

   type:"voice-answer",

   to:d.from,

   answer

  }));

 }


 // ANSWER
 if(d.type==="voice-answer"){

  const pc =
  peers[d.from];

  if(pc){

   await pc.setRemoteDescription(
    new RTCSessionDescription(d.answer)
   );

  }

 }


 // ICE
 if(d.type==="voice-ice"){

  const pc =
  peers[d.from];

  if(pc){

   await pc.addIceCandidate(
    new RTCIceCandidate(d.candidate)
   );

  }

 }


 // SPEAKING INDICATOR
 if(d.type==="voice-speaking"){

  const el =
  document.getElementById(
   "voice-user-"+d.id
  );


  if(el){

   if(d.speaking){

    el.style.background =
    "#22c55e";

    el.style.color =
    "white";

   }else{

    el.style.background =
    "";

    el.style.color =
    "";

   }

  }

 }

};
