const ws = new WebSocket(
  (location.protocol === "https:" ? "wss://" : "ws://") + location.host
);

const messages = document.getElementById("messages");
const msg = document.getElementById("msg");
const online = document.getElementById("online");
const usersBox = document.getElementById("users");
const channelName = document.getElementById("channelName");

const username = localStorage.getItem("username") || "Guest";
const avatar = localStorage.getItem("avatar") || "/logo.svg";

let currentChannel = "общий";

ws.onopen = () => joinChannel(currentChannel);

ws.onmessage = e => {
  const data = JSON.parse(e.data);

  if (data.type === "online") {
    online.textContent = "🟢 Онлайн: " + data.count;
  }

  if (data.type === "users") {
    usersBox.innerHTML = "";
    data.users.forEach(u => {
      const div = document.createElement("div");
      div.className = "user-item" + (u.speaking ? " speaking" : "");
      div.innerHTML = `<img src="${u.avatar}"><span>${u.username}</span>`;
      usersBox.appendChild(div);
    });
  }

  if (data.type === "voice-activity") {
    document.querySelectorAll(".user-item").forEach(el => {
      if (el.textContent.includes(data.user)) {
        el.classList.toggle("speaking", data.speaking);
      }
    });
  }

  if (data.type === "history") {
    messages.innerHTML = "";
    data.messages.forEach(renderMessage);
  }

  if (data.type === "message" && data.channel === currentChannel) {
    renderMessage(data);
  }
};

function renderMessage(m) {
  const d = document.createElement("div");
  d.className = "message";
  d.innerHTML = `
    <span class="user">${m.user}</span>
    <span class="time">${m.time}</span>
    <div class="text">${m.text}</div>
  `;
  messages.appendChild(d);
}

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

function joinChannel(name) {
  currentChannel = name;
  channelName.textContent = "# " + name;
  messages.innerHTML = "";
  ws.send(JSON.stringify({
    type: "join",
    channel: name,
    user: username,
    avatar
  }));
}
