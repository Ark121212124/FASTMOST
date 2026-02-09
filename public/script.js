const ws = new WebSocket(
  (location.protocol === "https:" ? "wss://" : "ws://") + location.host
);

/* ================== CONFIG ================== */
const GIPHY_KEY = "sdMbKKOlbQ19nMxNRPXFccE1IxYAmXfy";

/* ================== ELEMENTS ================== */
const messages = document.getElementById("messages");
const msg = document.getElementById("msg");
const online = document.getElementById("online");
const usersBox = document.getElementById("users");
const channelName = document.getElementById("channelName");
const voiceOverlay = document.getElementById("voiceOverlay");
const voiceUsersBox = document.getElementById("voiceUsers");
const textChannelsBox = document.getElementById("textChannels");
const emojiPicker = document.getElementById("emojiPicker");
const gifPicker = document.getElementById("gifPicker");

/* ================== USER ================== */
const username = localStorage.getItem("username") || "Guest";
const avatar = localStorage.getItem("avatar") || "/logo.svg";

/* ================== STATE ================== */
let currentChannel = "общий";

/* ================== WS ================== */
ws.onopen = () => joinChannel(currentChannel);

ws.onmessage = e => {
  const data = JSON.parse(e.data);

  if (data.type === "online") {
    online.textContent = "🟢 Онлайн: " + data.count;
  }

  if (data.type === "users") {
    usersBox.innerHTML = "";
    voiceUsersBox.innerHTML = "";
    let inVoice = false;

    data.users.forEach(u => {
      const div = document.createElement("div");
      div.className = "user-item" + (u.speaking ? " speaking" : "");
      div.innerHTML = `<img src="${u.avatar}"><span>${u.username}</span>`;
      usersBox.appendChild(div);

      if (typeof u.speaking === "boolean") {
        inVoice = true;
        const v = document.createElement("div");
        v.className = "voice-user" + (u.speaking ? " speaking" : "");
        v.innerHTML = `<img src="${u.avatar}"><span>${u.username}</span>`;
        voiceUsersBox.appendChild(v);
      }
    });

    voiceOverlay.classList.toggle("hidden", !inVoice);
  }

  if (data.type === "history") {
    messages.innerHTML = "";
    data.messages.forEach(renderMessage);
    messages.scrollTop = messages.scrollHeight;
  }

  if (data.type === "message" && data.channel === currentChannel) {
    renderMessage(data);
    messages.scrollTop = messages.scrollHeight;
  }
};

/* ================== CHAT ================== */
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
  if (!msg.value.trim()) return;

  ws.send(JSON.stringify({
    type: "message",
    channel: currentChannel,
    user: username,
    avatar,
    text: msg.value,
    time: new Date().toLocaleTimeString().slice(0, 5)
  }));

  msg.value = "";
}

/* ================== CHANNELS ================== */
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

/* ================== EMOJI ================== */
const emojis = "😀 😁 😂 🤣 😊 😎 😍 😘 🤔 😴 😡 👍 👎 👏 🙌 🔥 💯 ❤️ 🎉 👀 💀".split(" ");

emojiPicker.innerHTML = emojis.map(e =>
  `<span onclick="addEmoji('${e}')">${e}</span>`
).join("");

function addEmoji(e) {
  msg.value += e;
}

function toggleEmoji() {
  emojiPicker.classList.toggle("hidden");
  gifPicker.classList.add("hidden");
}

/* ================== GIF (GIPHY) ================== */
async function toggleGif() {
  gifPicker.classList.toggle("hidden");
  emojiPicker.classList.add("hidden");
  loadGifs("funny");
}

async function loadGifs(query) {
  gifPicker.innerHTML = "Загрузка GIF...";

  const r = await fetch(
    `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=15`
  );
  const d = await r.json();

  gifPicker.innerHTML = "";
  d.data.forEach(g => {
    const img = document.createElement("img");
    img.src = g.images.fixed_width.url;
    img.onclick = () => {
      msg.value = `<img src="${img.src}" class="gif">`;
      send();
      gifPicker.classList.add("hidden");
    };
    gifPicker.appendChild(img);
  });
}
