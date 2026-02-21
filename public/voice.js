// =======================
// FASTMOST VOICE
// =======================

let currentVoice = null;


// JOIN
window.joinVoice = function(channel){

 console.log("JOIN VOICE:", channel);

 currentVoice = channel;

 document
 .getElementById("voiceOverlay")
 .classList
 .remove("hidden");

 document
 .getElementById("voiceChannelName")
 .innerText = channel;


 ws.send(JSON.stringify({

  type:"voice-join",

  channel:channel,

  user:localStorage.getItem("username") || "Guest"

 }));

};


// LEAVE
window.leaveVoice = function(){

 ws.send(JSON.stringify({

  type:"voice-leave"

 }));

 document
 .getElementById("voiceOverlay")
 .classList
 .add("hidden");

 document
 .getElementById("voiceUsers")
 .innerHTML="";

};


// RENDER USERS
window.renderVoiceUsers = function(users){

 const container =
 document.getElementById("voiceUsers");

 container.innerHTML="";

 users.forEach(user=>{

  const div =
  document.createElement("div");

  div.innerHTML =
  "🎤 " + user.username;

  container.appendChild(div);

 });

};
