// =======================
// FASTMOST GLOBAL WS
// =======================

window.ws = new WebSocket(
 location.protocol === "https:"
 ? "wss://" + location.host
 : "ws://" + location.host
);

window.ws.onopen = () => {
 console.log("WS connected");
};

window.ws.onmessage = (event) => {

 const data = JSON.parse(event.data);

 console.log("WS event:", data);

 if(data.type === "voice-users"){

  window.renderVoiceUsers(data.users);

 }

};


// =======================
// CHAT
// =======================

function sendMessage(){

 const input =
 document.getElementById("msg");

 if(!input.value) return;

 ws.send(JSON.stringify({

  type:"message",

  text:input.value,

  user:localStorage.getItem("username")

 }));

 input.value="";

}


// =======================
// CHANNEL
// =======================

function joinChannel(name){

 document.getElementById("channelName")
 .innerText = "# " + name;

}


// =======================
// CREATE CHANNEL
// =======================

function createVoiceChannel(){

 const name =
 prompt("Название voice:");

 if(!name) return;

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
