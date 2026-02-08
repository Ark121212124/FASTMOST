const ws = new WebSocket(
  (location.protocol === "https:" ? "wss://" : "ws://") + location.host
);

/* ===== ELEMENTS ===== */
const messages = document.getElementById("messages");
const msg = document.getElementById("msg");
const online = document.getElementById("online");
const usersBox = document.getElementById("users");
const channelName = document.getElementById("channelName");

/* ===== USER ===== */
const username = localStorage.getItem("username") || "Guest";
const avatar = localStorage.getItem("avatar") || "/logo.svg";

/* ===== STATE ===== */
let currentChannel = "общий";

/* ===== WS OPEN ===== */
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "join",
    channel: currentChannel,
    user: username,
    avatar
  }));
};

/* ===== WS MESSAGE ===== */
ws.onmessage = e => {
  const data = JSON.parse(e.data);

  /* ONLINE COUNT */
  if (data.type === "online") {
    online.textContent = "🟢 Онлайн: " + data.count;
    return;
  }

  /* USERS LIST */
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

  /* CHAT MESSAGE */
  if (data.type === "message" && data.channel === currentChannel) {
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

  /* HISTORY */
  if (data.type === "history") {
    messages.innerHTML = "";
    data.messages.forEach(m => {
      const div = document.createElement("div");
      div.className = "message";
      div.innerHTML = `
        <span class="user">${m.user}</span>
        <span class="time">${m.time}</span>
        <div class="text">${m.text}</div>
      `;
      messages.appendChild(div);
    });
    messages.scrollTop = messages.scrollHeight;
  }
};

/* ===== SEND MESSAGE ===== */
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

/* ===== TEXT CHANNELS ===== */
function switchChannel(name) {
  currentChannel = name;
  channelName.textContent = "# " + name;
  messages.innerHTML = "";

  document.querySelectorAll(".channel").forEach(c =>
    c.classList.remove("active")
  );

  ws.send(JSON.stringify({
    type: "join",
    channel: currentChannel,
    user: username,
    avatar
  }));
}

function createTextChannel() {
  const name = prompt("Название канала");
  if (!name) return;

  const div = document.createElement("div");
  div.className = "channel";
  div.textContent = "# " + name;
  div.onclick = () => switchChannel(name);

  document.getElementById("textChannels").appendChild(div);
}

/* ===== VOICE CHANNELS ===== */
function createVoiceChannel() {
  const name = prompt("Название voice-канала");
  if (!name) return;

  const div = document.createElement("div");
  div.className = "channel";
  div.textContent = "🔊 " + name;
  div.onclick = () => joinVoice(name);

  document.getElementById("voiceChannels").appendChild(div);
}
