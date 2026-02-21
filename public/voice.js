// =============================
// FASTMOST VOICE SYSTEM
// =============================


let localStream = null;
let currentVoice = null;

const peers = {};

window.localStream = null;


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

  window.localStream = localStream;

 } catch (e){

  alert("Разреши доступ к микрофону");

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

  channel,

  user: localStorage.getItem("username") || "Guest"

 }));

}


// =============================
// LEAVE
// =============================

function leaveVoice(){

 if (!currentVoice) return;


 ws.send(JSON.stringify({

  type: "voice-leave"

 }));


 localStream?.getTracks()
 .forEach(track => track.stop());


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

 if (!container) return;


 container.innerHTML = "";


 users.forEach(user => {

  const div =
  document.createElement("div");

  div.className =
  "voice-user";

  div.innerHTML =
  "🎤 " + user.username;

  container.appendChild(div);

 });

}


// делаем глобальной
window.renderVoiceUsers =
renderVoiceUsers;
