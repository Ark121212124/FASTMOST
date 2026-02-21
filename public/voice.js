let currentVoice = null;


// JOIN VOICE
async function joinVoice(channel){

 console.log("Joining voice:", channel);

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

}


// LEAVE
function leaveVoice(){

 ws.send(JSON.stringify({

  type:"voice-leave"

 }));


 document
 .getElementById("voiceOverlay")
 .classList
 .add("hidden");


 document
 .getElementById("voiceUsers")
 .innerHTML = "";


 currentVoice = null;

}


// RENDER USERS
function renderVoiceUsers(users){

 const container =
 document.getElementById("voiceUsers");

 container.innerHTML = "";


 users.forEach(user => {

  const div =
  document.createElement("div");

  div.innerHTML =
  "🎤 " + user.username;

  container.appendChild(div);

 });

}
