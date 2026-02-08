const ws = new WebSocket(
  (location.protocol === "https:" ? "wss://" : "ws://") + location.host
);

const messages = document.getElementById("messages");
const username = localStorage.getItem("username") || "Guest";

ws.onmessage = e => {
  const data = JSON.parse(e.data);

  if (data.type === "online") {
    document.getElementById("online").textContent =
      "🟢 Онлайн: " + data.count;
    return;
  }

  if (data.type === "file") {
    const div = document.createElement("div");
    div.className = "message";
    div.innerHTML = `
      <span class="user">${data.user}</span>
      <span class="time">${data.time}</span>
      <div class="text">
        <a href="${data.url}" target="_blank">${data.name}</a>
      </div>
    `;
    messages.appendChild(div);
    return;
  }

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
    user: username,
    text: msg.value,
    time: new Date().toLocaleTimeString().slice(0,5)
  }));

  msg.value = "";
}
