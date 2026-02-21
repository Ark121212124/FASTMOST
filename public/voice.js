// ==========================
// FASTMOST REAL VOICE SYSTEM
// ==========================

let localStream = null;
let currentVoice = null;
let myId = null;

const peers = {};

const RTC_CONFIG = {
 iceServers: [
  { urls: "stun:stun.l.google.com:19302" }
 ]
};


// ==========================
// JOIN VOICE
// ==========================

window.joinVoice = async function(channel){

 console.log("Joining voice:", channel);

 currentVoice = channel;

 document
 .getElementById("voiceOverlay")
 .classList.remove("hidden");

 document
 .getElementById("voiceChannelName")
 .innerText = channel;


 localStream =
 await navigator.mediaDevices.getUserMedia({
  audio: {
   echoCancellation:true,
   noiseSuppression:true,
   autoGainControl:true
  }
 });


 startSpeakingDetection();


 ws.send(JSON.stringify({

  type:"voice-join",

  channel,

  user:localStorage.getItem("username")

 }));

};


// ==========================
// LEAVE
// ==========================

window.leaveVoice = function(){

 ws.send(JSON.stringify({
  type:"voice-leave"
 }));

 Object.values(peers)
 .forEach(pc=>pc.close());

 for(const id in peers)
 delete peers[id];

 localStream?.getTracks()
 .forEach(track=>track.stop());

 document
 .getElementById("voiceOverlay")
 .classList.add("hidden");

};


// ==========================
// CREATE PEER
// ==========================

function createPeer(id){

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

   ws.send(JSON.stringify({

    type:"voice-ice",

    to:id,

    candidate:e.candidate

   }));

  }

 };

 return pc;

}


// ==========================
// SPEAK DETECTION
// ==========================

function startSpeakingDetection(){

 const ctx =
 new AudioContext();

 const mic =
 ctx.createMediaStreamSource(localStream);

 const analyser =
 ctx.createAnalyser();

 mic.connect(analyser);

 analyser.fftSize = 512;

 const data =
 new Uint8Array(analyser.frequencyBinCount);


 function detect(){

  analyser.getByteFrequencyData(data);

  const volume =
  data.reduce((a,b)=>a+b)/data.length;

  ws.send(JSON.stringify({

   type:"voice-speaking",

   speaking:volume > 20

  }));

  requestAnimationFrame(detect);

 }

 detect();

}


// ==========================
// RENDER USERS
// ==========================

window.renderVoiceUsers = function(users){

 const container =
 document.getElementById("voiceUsers");

 container.innerHTML="";

 users.forEach(user=>{

  const div =
  document.createElement("div");

  div.id = "voice-user-"+user.id;

  div.className =
  "voice-user";

  div.innerHTML =
  "🎤 "+user.username;

  container.appendChild(div);

 });

};


// ==========================
// WS EVENTS
// ==========================

ws.addEventListener("message", async e => {

 const d = JSON.parse(e.data);


 if(d.type === "init")
 myId = d.id;


 if(d.type === "voice-users"){

  renderVoiceUsers(d.users);

  for(const u of d.users){

   if(u.id === myId) continue;

   const pc =
   createPeer(u.id);

   const offer =
   await pc.createOffer();

   await pc.setLocalDescription(offer);

   ws.send(JSON.stringify({

    type:"voice-offer",

    to:u.id,

    offer

   }));

  }

 }


 if(d.type === "voice-offer"){

  const pc =
  createPeer(d.from);

  await pc.setRemoteDescription(d.offer);

  const answer =
  await pc.createAnswer();

  await pc.setLocalDescription(answer);

  ws.send(JSON.stringify({

   type:"voice-answer",

   to:d.from,

   answer

  }));

 }


 if(d.type === "voice-answer"){

  await peers[d.from]
  ?.setRemoteDescription(d.answer);

 }


 if(d.type === "voice-ice"){

  await peers[d.from]
  ?.addIceCandidate(d.candidate);

 }


 if(d.type === "voice-speaking"){

  const el =
  document.getElementById(
   "voice-user-"+d.id
  );

  if(el){

   el.style.color =
   d.speaking ? "#22c55e" : "white";

  }

 }

});
