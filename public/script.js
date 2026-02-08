const ws = new WebSocket(
  (location.protocol === "https:" ? "wss://" : "ws://") + location.host
);

/* ===== ELEMENTS ===== */
const messages = document.getElementById("messages");
const msg = document.getElementById("msg");
const online = document.getElementById("online");
const usersBox = document.getElementById("users");
const channelName = document.getElementById("channelName");
const voiceOverlay = document.getElementById("voiceOverlay");
const voiceUsersBox = document.getElementById("voiceUsers");
const textChannelsBox = document.getElementById("textChannels");

/* ===== USER ===== */
const username = localStorage.getItem("username") || "Guest";
const avatar = localStorage.getItem("avatar") || "/logo.svg";

/* ===== STATE ===== */
let currentChannel = "общий";

/* ===== WS OPEN ===== */
ws.onopen = () => joinChannel(currentChannel);

/* ===== WS MESSAGE ===== */
ws.onmessage = e => {
  const data = JSON.parse(e.data);

  if (data.type === "online") {
    online.textContent = "🟢 Онлайн: " + data.count;
  }

  if (data.type === "users") {
    usersBox.innerHTML = "";
    voiceUsersBox.innerHTML = "";

    let anyoneInVoice = false;

    data.users.forEach(u => {
      const userDiv = document.createElement("div");
      userDiv.className = "user-item" + (u.speaking ? " speaking" : "");
      userDiv.innerHTML = `<img src="${u.avatar}"><span>${u.username}</span>`;
      usersBox.appendChild(userDiv);

      if (u.speaking !== undefined) {
        anyoneInVoice = true;
        const v = document.createElement("div");
        v.className = "voice-user" + (u.speaking ? " speaking" : "");
        v.innerHTML = `
          <img src="${u.avatar}">
          <span>${u.username}</span>
          <span class="icons">${u.speaking ? "🔊" : "🎧"}</span>
        `;
        voiceUsersBox.appendChild(v);
      }
    });

    voiceOverlay.classList.toggle("hidden", !anyoneInVoice);
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

/* ===== HELPERS ===== */
function renderMessage(m) {
  const d = document.createElement("div");
  d.className = "message";
  d.innerHTML = `
    <span class="user">${m.user}</span>
    <span class="time">${m.time}</span>
    <div class="text">${m.text}</div>
  `;
  messages.appendChild(d);
  messages.scrollTop = messages.scrollHeight;
}

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

/* ===== JOIN CHANNEL ===== */
function joinChannel(name) {
  currentChannel = name;
  channelName.textContent = "# " + name;
  messages.innerHTML = "";

  document.querySelectorAll(".channel").forEach(c =>
    c.classList.remove("active")
  );

  const active = [...document.querySelectorAll(".channel")]
    .find(c => c.dataset.name === name);
  if (active) active.classList.add("active");

  ws.send(JSON.stringify({
    type: "join",
    channel: name,
    user: username,
    avatar
  }));
}

/* ===== TEXT CHANNELS ===== */
function createTextChannel() {
  const name = prompt("Название канала");
  if (!name) return;

  const div = document.createElement("div");
  div.className = "channel";
  div.dataset.name = name;
  div.textContent = "# " + name;
  div.onclick = () => joinChannel(name);

  textChannelsBox.appendChild(div);
}

/* ===== VOICE CHANNELS ===== */
function createVoiceChannel() {
  const name = prompt("Название voice-канала");
  if (!name) return;

  const div = document.createElement("div");
  div.className = "channel voice";
  div.dataset.name = name;
  div.textContent = "🔊 " + name;
  div.onclick = () => joinVoice(name);

  document.getElementById("voiceChannels").appendChild(div);
}
