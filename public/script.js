const ws = new WebSocket(
  (location.protocol === "https:" ? "wss://" : "ws://") + location.host
);

/* ===== ELEMENTS ===== */
const messages = document.getElementById("messages");
const msg = document.getElementById("msg");
const online = document.getElementById("online");
const usersBox = document.getElementById("users");
const channelName = document.getElementById("channelName");
const textChannelsBox = document.getElementById("textChannels");

/* ===== USER ===== */
const username = localStorage.getItem("username") || "Guest";
const avatar = localStorage.getItem("avatar") || "/logo.svg";

/* ===== STATE ===== */
let currentChannel = "общий";

/* ===== WS OPEN ===== */
ws.onopen = () => {
  joinChannel(currentChannel);
};

/* ===== WS MESSAGE ===== */
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

  if (data.type === "history") {
    messages.innerHTML = "";
    data.messages.forEach(m => renderMessage(m));
    messages.scrollTop = messages.scrollHeight;
    return;
  }

  if (data.type === "message" && data.channel === currentChannel) {
    renderMessage(data);
    messages.scrollTop = messages.scrollHeight;
  }
};

/* ===== HELPERS ===== */
function renderMessage(data) {
  const div = document.createElement("div");
  div.className = "message";
  div.innerHTML = `
    <span class="user">${data.user}</span>
    <span class="time">${data.time}</span>
    <div class="text">${data.text}</div>
  `;
  messages.appendChild(div);
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

/* ===== CHANNEL JOIN ===== */
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
