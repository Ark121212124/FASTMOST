// =============================
// FASTMOST MAIN SCRIPT
// =============================


// Глобальный WebSocket
window.ws = new WebSocket(
 location.protocol === "https:"
 ? "wss://" + location.host
 : "ws://" + location.host
);


let myId = null;
let currentChannel = "общий";


// =============================
// WS EVENTS
// =============================

ws.onopen = () => {

 console.log("WS connected");

 ws.send(JSON.stringify({
  type: "join",
  channel: currentChannel,
  user: localStorage.getItem("username") || "Guest"
 }));

};


ws.onmessage = (event) => {

 const data = JSON.parse(event.data);

 console.log("WS EVENT:", data);


 if (data.type === "init") {

  myId = data.id;

 }


 if (data.type === "message") {

  addMessage(data);

 }


 if (data.type === "voice-users") {

  if (window.renderVoiceUsers) {
   window.renderVoiceUsers(data.users);
  }

 }

};


// =============================
// CHAT
// =============================

function sendMessage(){

 const input =
 document.getElementById("msg");

 if (!input || !input.value) return;


 ws.send(JSON.stringify({

  type: "message",

  text: input.value,

  user: localStorage.getItem("username") || "Guest",

  channel: currentChannel

 }));

 input.value = "";

}


function addMessage(msg){

 const container =
 document.getElementById("messages");

 if (!container) return;


 const div =
 document.createElement("div");

 div.className = "message";

 div.innerHTML = `
 <b>${msg.user}</b>: ${msg.text}
 `;

 container.appendChild(div);

 container.scrollTop =
 container.scrollHeight;

}


// =============================
// CHANNEL
// =============================

function joinChannel(channel){

 currentChannel = channel;

 const el =
 document.getElementById("channelName");

 if (el) el.textContent = "# " + channel;


 ws.send(JSON.stringify({

  type: "join",

  channel,

  user: localStorage.getItem("username")

 }));

}


// =============================
// CREATE CHANNELS
// =============================

function createTextChannel(){

 const name =
 prompt("Название канала:");

 if (!name) return;

 const div =
 document.createElement("div");

 div.className = "channel text";

 div.innerText = name;

 div.onclick =
 () => joinChannel(name);

 document
 .getElementById("textChannels")
 .appendChild(div);

}


function createVoiceChannel(){

 const name =
 prompt("Название voice:");

 if (!name) return;

 const div =
 document.createElement("div");

 div.className = "channel voice";

 div.innerText = name;

 div.onclick =
 () => joinVoice(name);

 document
 .getElementById("voiceChannels")
 .appendChild(div);

}


// =============================
// USER CONTROLS
// =============================

function toggleMute(){

 if (!window.localStream) return;

 const track =
 window.localStream
 .getAudioTracks()[0];

 track.enabled =
 !track.enabled;

}


function toggleDeafen(){

 leaveVoice();

}
