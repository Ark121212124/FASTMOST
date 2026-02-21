window.ws = new WebSocket(
 location.protocol === "https:"
 ? "wss://" + location.host
 : "ws://" + location.host
);

let username =
localStorage.getItem("username") || "Guest";


ws.onopen = () => {

 console.log("WS connected");

};


ws.onmessage = (event) => {

 const data =
 JSON.parse(event.data);

 console.log("WS:", data);


 if(data.type === "voice-users"){

  renderVoiceUsers(data.users);

 }

};


// =================
// CHAT (optional)
// =================

function sendMessage(){

 const input =
 document.getElementById("msg");

 if(!input.value) return;

 ws.send(JSON.stringify({

  type:"message",

  user:username,

  text:input.value

 }));

 input.value="";

}
