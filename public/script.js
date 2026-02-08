const ws = new WebSocket(
  (location.protocol === "https:" ? "wss://" : "ws://") + location.host
);

const messages = document.getElementById("messages");
const msg = document.getElementById("msg");
const online = document.getElementById("online");
const usersBox = document.getElementById("users");

const username = localStorage.getItem("username") || "Guest";
const avatar = localStorage.getItem("avatar") || "/logo.svg";

let currentChannel = "общий";

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "join",
    channel: currentChannel,
    user: username,
    avatar
  }));
};

ws.onmessage = e => {
  const data = JSON.parse(e.data);

  if (data.type === "online") {
    online.textContent = "🟢 Онлайн: " + data.count;
    return;
  }

  if (data.type === "users") {
    usersBox.innerHTML = "";
    data.users.forEach(u => {
      const div = document.createElement("div");
      div.className = "user-item";
      div.innerHTML = `
        <img src="${u.avatar}">
        <span>${u.username}</span>
      `;
      usersBox.appendChild(div);
    });
    return;
  }

  if (data.type === "message" && data.channel === currentChannel) {
    const div = document.createElement("div");
    div.className = "message";
    div.innerHTML = `
      <span class="user">${data.user}</span>
      <span class="time">${data.time}</span>
      <div class="text">${data.text}</div>
    `;
    messages.appendChild(div);
  }
};

function send() {
  if (!msg.value) return;
  ws.send(JSON.stringify({
    type: "message",
    channel: currentChannel,
    user: username,
    avatar,
    text: msg.value,
    time: new Date().toLocaleTimeString().slice(0,5)
  }));
  msg.value = "";
}
