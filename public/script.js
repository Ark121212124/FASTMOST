const ws = new WebSocket(
  (location.protocol === "https:" ? "wss://" : "ws://") + location.host
);

const messages = document.getElementById("messages");
const username = localStorage.getItem("username") || "Guest";

let currentChannel = "общий";

ws.onmessage = e => {
  const data = JSON.parse(e.data);

  if (data.type === "online") {
    online.textContent = "🟢 Онлайн: " + data.count;
    return;
  }

  if (data.channel !== currentChannel) return;

  const msg = document.createElement("div");
  msg.className = "message";

  msg.innerHTML = `
    <span class="user">${data.user}</span>
    <span class="time">${data.time}</span>
    <div class="text">${data.text}</div>
  `;

  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
};

function send() {
  if (!msg.value) return;

  ws.send(JSON.stringify({
    type: "message",
    channel: currentChannel,
    user: username,
    text: msg.value,
    time: new Date().toLocaleTimeString().slice(0,5)
  }));

  msg.value = "";
}

/* CHANNELS */
const textChannels = document.getElementById("textChannels");

function createChannel() {
  const name = prompt("Название канала");
  if (!name) return;

  const div = document.createElement("div");
  div.className = "channel";
  div.textContent = "# " + name;
  div.onclick = () => switchChannel(name);
  textChannels.appendChild(div);
}

function switchChannel(name) {
  currentChannel = name;
  channelName.textContent = "# " + name;
  messages.innerHTML = "";
}
