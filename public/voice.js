// ==========================
// FASTMOST VOICE FINAL FIXED
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

let speakingState = false;


// ==========================
// JOIN VOICE
// ==========================

window.joinVoice = async function(channel){

 currentVoice = channel;

 document.getElementById("voiceOverlay")
 .classList.remove("hidden");

 document.getElementById("voiceChannelName")
 .innerText = channel;


 localStream =
 await navigator.mediaDevices.getUserMedia({
  audio:true
 });


 startSpeakingDetection(localStream);


 ws.send(JSON.stringify({

  type:"voice-join",
  channel,
  user:localStorage.getItem("username")

 }));

};


// ==========================
// CREATE PEER
// ==========================

function createPeer(id){

 if(peers[id]) return peers[id];

 console.log("Creating peer:", id);

 const pc =
 new RTCPeerConnection(RTC_CONFIG);

 peers[id] = pc;


 // add local audio
 localStream.getTracks()
 .forEach(track=>{
  pc.addTrack(track, localStream);
 });


 // receive remote audio
 pc.ontrack = event => {

  console.log("Receiving audio from:", id);

  let audio =
  document.getElementById("audio-"+id);

  if(!audio){

   audio =
   document.createElement("audio");

   audio.id="audio-"+id;

   audio.autoplay=true;

   audio.controls=false;

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
  volume > 15;

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

 container.innerHTML="";

 users.forEach(user=>{

  const div =
  document.createElement("div");

  div.id="voice-user-"+user.id;

  div.className="voice-user";

  div.innerText="🎤 "+user.username;

  container.appendChild(div);

 });

}


// ==========================
// WS EVENTS
// ==========================

ws.onmessage = async event => {

 const d =
 JSON.parse(event.data);


 if(d.type==="init")
 myId = d.id;


 // ======================
 // USERS LIST
 // ======================

 if(d.type==="voice-users"){

  renderVoiceUsers(d.users);

  for(const user of d.users){

   if(user.id===myId) continue;

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


 // ======================
 // RECEIVE OFFER
 // ======================

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


 // ======================
 // RECEIVE ANSWER
 // ======================

 if(d.type==="voice-answer"){

  const pc =
  peers[d.from];

  if(pc){

   await pc.setRemoteDescription(
    new RTCSessionDescription(d.answer)
   );

  }

 }


 // ======================
 // ICE
 // ======================

 if(d.type==="voice-ice"){

  const pc =
  peers[d.from];

  if(pc){

   await pc.addIceCandidate(
    new RTCIceCandidate(d.candidate)
   );

  }

 }


 // ======================
 // SPEAKING
 // ======================

 if(d.type==="voice-speaking"){

  const el =
  document.getElementById(
   "voice-user-"+d.id
  );

  if(el){

   el.style.background =
   d.speaking ? "#22c55e" : "";

   el.style.color =
   d.speaking ? "white" : "";

  }

 }

};
