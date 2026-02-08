const ws = new WebSocket(
  (location.protocol === "https:" ? "wss://" : "ws://") + location.host
);

const messages = document.getElementById("messages");
const msg = document.getElementById("msg");
const online = document.getElementById("online");

const username = localStorage.getItem("username") || "Guest";

let currentChannel = "общий";

ws.onmessage = e => {
  const data = JSON.parse(e.data);

  if (data.type === "online") {
    online.textContent = "🟢 Онлайн: " + data.count;
    return;
  }

  if (data.channel && data.channel !== currentChannel) return;

  const div = document.createElement("div");
  div.className = "message";

  div.innerHTML = `
    <span class="user">${data.user}</span>
    <span class="time">${data.time}</span>
    <div class="text">${data.text}</div>
  `;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
};

function send() {
  if (!msg.value || ws.readyState !== 1) return;

  ws.send(JSON.stringify({
    type: "message",
    channel: currentChannel,
    user: username,
    text: msg.value,
    time: new Date().toLocaleTimeString().slice(0,5)
  }));

  msg.value = "";
}
