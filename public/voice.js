// =============================
// FASTMOST VOICE SYSTEM
// =============================

let localStream = null;
let currentVoice = null;
let myId = null;

const peers = {};


// =============================
// CONNECT WS
// =============================

const ws = new WebSocket(
 location.protocol === "https:"
 ? "wss://" + location.host
 : "ws://" + location.host
);


ws.onopen = () => {

 console.log("Voice WS connected");

};


ws.onerror = (e) => {

 console.error("Voice WS error:", e);

};


ws.onclose = () => {

 console.log("Voice WS closed");

};


// =============================
// RECEIVE EVENTS
// =============================

ws.onmessage = async (event) => {

 const data = JSON.parse(event.data);

 console.log("VOICE EVENT:", data);


 if (data.type === "init") {

  myId = data.id;

 }


 if (data.type === "voice-users") {

  renderVoiceUsers(data.users);

 }

};


// =============================
// JOIN VOICE
// =============================

async function joinVoice(channel){

 console.log("Joining voice:", channel);

 try {

  localStream =
  await navigator.mediaDevices.getUserMedia({
   audio: true
  });

 } catch (e) {

  alert("Разреши доступ к микрофону");

  console.error(e);

  return;

 }


 currentVoice = channel;


 document
 .getElementById("voiceOverlay")
 .classList
 .remove("hidden");


 document
 .getElementById("voiceChannelName")
 .textContent = channel;


 ws.send(JSON.stringify({

  type: "voice-join",

  channel: channel,

  user: localStorage.getItem("username") || "User"

 }));

}


// =============================
// LEAVE VOICE
// =============================

function leaveVoice(){

 if (!currentVoice) return;


 ws.send(JSON.stringify({

  type: "voice-leave"

 }));


 localStream?.getTracks().forEach(track => {

  track.stop();

 });


 document
 .getElementById("voiceOverlay")
 .classList
 .add("hidden");


 document
 .getElementById("voiceUsers")
 .innerHTML = "";


 currentVoice = null;

}


// =============================
// RENDER USERS
// =============================

function renderVoiceUsers(users){

 const container =
 document.getElementById("voiceUsers");


 container.innerHTML = "";


 users.forEach(user => {

  const div =
  document.createElement("div");


  div.className = "voice-user";


  if (user.id === myId) {

   div.innerHTML =
   "🟢 <b>" + user.username + " (Вы)</b>";

  } else {

   div.innerHTML =
   "🎤 " + user.username;

  }


  container.appendChild(div);

 });

}
