const ws = new WebSocket(
  (location.protocol === "https:" ? "wss://" : "ws://") + location.host
);

/* ===== ELEMENTS ===== */
const messages = document.getElementById("messages");
const msg = document.getElementById("msg");
const online = document.getElementById("online");
const usersBox = document.getElementById("users"); // div для списка пользователей

/* ===== STATE ===== */
const username = localStorage.getItem("username") || "Guest";
let currentChannel = "общий";

/* ===== HELPERS ===== */
function addMessage(data) {
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

function renderUsers(list) {
  if (!usersBox) return;
  usersBox.innerHTML = "";
  list.forEach(u => {
    const div = document.createElement("div");
    div.className = "user-item";
    div.textContent = u;
    usersBox.appendChild(div);
  });
}

/* ===== WEBSOCKET ===== */
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "join",
    channel: currentChannel,
    user: username
  }));
};

ws.onmessage = e => {
  const data = JSON.parse(e.data);

  /* ONLINE COUNT */
  if (data.type === "online") {
    online.textContent = "🟢 Онлайн: " + data.count;
    return;
  }

  /* USERS IN CHANNEL */
  if (data.type === "users") {
    renderUsers(data.users);
    return;
  }

  /* HISTORY */
  if (data.type === "history") {
    messages.innerHTML = "";
    data.messages.forEach(addMessage);
    return;
  }

  /* MESSAGE */
  if (data.type === "message") {
    if (data.channel !== currentChannel) return;
    addMessage(data);
  }
};

/* ===== SEND MESSAGE ===== */
function send() {
  if (!msg.value || ws.readyState !== 1) return;

  ws.send(JSON.stringify({
    type: "message",
    channel: currentChannel,
    user: username,
    text: msg.value,
    time: new Date().toLocaleTimeString().slice(0, 5)
  }));

  msg.value = "";
}

/* ===== CHANNELS ===== */
function switchChannel(name) {
  currentChannel = name;
  messages.innerHTML = "";

  ws.send(JSON.stringify({
    type: "join",
    channel: currentChannel,
    user: username
  }));
}

function createChannel() {
  const name = prompt("Название канала");
  if (!name) return;

  const div = document.createElement("div");
  div.className = "channel";
  div.textContent = "# " + name;
  div.onclick = () => switchChannel(name);

  document.getElementById("textChannels").appendChild(div);
}
