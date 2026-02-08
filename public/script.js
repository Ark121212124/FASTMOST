const ws = new WebSocket(
  (location.protocol === "https:" ? "wss://" : "ws://") + location.host
);

const messages = document.getElementById("messages");
const msg = document.getElementById("msg");
const online = document.getElementById("online");

const username = localStorage.getItem("username") || "Guest";
let currentChannel = "общий";

/* ===== РЕНДЕР СООБЩЕНИЯ ===== */
function renderMessage(data) {
  if (data.channel !== currentChannel) return;

  const div = document.createElement("div");
  div.className = "message";

  div.innerHTML = `
    <span class="user">${data.user}</span>
    <span class="time">${data.time}</span>
    <div class="text">${data.text}</div>
  `;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

/* ===== WEBSOCKET ===== */
ws.onmessage = e => {
  const data = JSON.parse(e.data);

  // онлайн
  if (data.type === "online") {
    online.textContent = "🟢 Онлайн: " + data.count;
    return;
  }

  // история сообщений
  if (data.type === "history") {
    messages.innerHTML = "";
    data.messages.forEach(renderMessage);
    return;
  }

  // обычное сообщение
  if (data.type === "message") {
    renderMessage(data);
  }
};

/* ===== ОТПРАВКА ===== */
function send() {
  if (!msg.value.trim()) return;
  if (ws.readyState !== WebSocket.OPEN) return;

  ws.send(JSON.stringify({
    type: "message",
    channel: currentChannel,
    user: username,
    text: msg.value,
    time: new Date().toLocaleTimeString().slice(0, 5)
  }));

  msg.value = "";
}

/* ===== ENTER ДЛЯ ОТПРАВКИ ===== */
msg.addEventListener("keydown", e => {
  if (e.key === "Enter") send();
});
