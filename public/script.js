const ws = new WebSocket(
  (location.protocol === "https:" ? "wss://" : "ws://") + location.host
);

const GIPHY_KEY = "sdMbKKOlbQ19nMxNRPXFccE1IxYAmXfy";

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

const username = localStorage.getItem("username") || "Guest";
const avatar = localStorage.getItem("avatar") || "/logo.svg";

let currentChannel = "общий";

ws.onopen = () => joinChannel(currentChannel);

ws.onmessage = e => {
  const d = JSON.parse(e.data);

  if (d.type === "online") {
    online.textContent = "🟢 Онлайн: " + d.count;
  }

  if (d.type === "users") {
    usersBox.innerHTML = "";
    voiceUsersBox.innerHTML = "";
    let showVoice = false;

    d.users.forEach(u => {
      const el = document.createElement("div");
      el.className = "user-item" + (u.speaking ? " speaking" : "");
      el.innerHTML = `<img src="${u.avatar}"><span>${u.username}</span>`;
      usersBox.appendChild(el);

      if (u.voice) {
        showVoice = true;
        const v = document.createElement("div");
        v.className = "voice-user" + (u.speaking ? " speaking" : "");
        v.innerHTML = `<img src="${u.avatar}"><span>${u.username}</span>`;
        voiceUsersBox.appendChild(v);
      }
    });

    voiceOverlay.classList.toggle("hidden", !showVoice);
  }

  if (d.type === "history") {
    messages.innerHTML = "";
    d.messages.forEach(renderMessage);
  }

  if (d.type === "message" && d.channel === currentChannel) {
    renderMessage(d);
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
  messages.scrollTop = messages.scrollHeight;
}

function send() {
  if (!msg.value.trim()) return;
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
  ws.send(JSON.stringify({ type: "join", channel: name, user: username, avatar }));
}

const emojis = "😀 😁 😂 🤣 😊 😎 😍 😘 🤔 😴 😡 👍 👎 👏 🙌 🔥 💯 ❤️".split(" ");
emojiPicker.innerHTML = emojis.map(e => `<span onclick="msg.value+='${e}'">${e}</span>`).join("");

function toggleEmoji() {
  emojiPicker.classList.toggle("hidden");
  gifPicker.classList.add("hidden");
}

async function toggleGif() {
  gifPicker.classList.toggle("hidden");
  emojiPicker.classList.add("hidden");
  gifPicker.innerHTML = "Загрузка...";
  const r = await fetch(
    `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=funny&limit=10`
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
