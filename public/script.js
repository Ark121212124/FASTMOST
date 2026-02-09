const ws = new WebSocket((location.protocol==="https:"?"wss://":"ws://")+location.host);

const messages = document.getElementById("messages");
const usersBox = document.getElementById("users");
const channelName = document.getElementById("channelName");

const username = localStorage.getItem("username");
const avatar = localStorage.getItem("avatar") || "/logo.svg";

ws.onopen = () => joinChannel("общий");

ws.onmessage = e => {
  const d = JSON.parse(e.data);

  if (d.type === "voice-state") {
    document.querySelectorAll(".voice-users").forEach(v => v.innerHTML = "");
    Object.entries(d.voices).forEach(([channel, users]) => {
      const box = document.querySelector(`.channel[data-name="${channel}"] .voice-users`);
      if (!box) return;
      users.forEach(u => {
        const div = document.createElement("div");
        div.className = "voice-user" + (u.speaking ? " speaking" : "");
        div.innerHTML = `<img src="${u.avatar}"><span>${u.username}</span>`;
        box.appendChild(div);
      });
    });
  }
};

function joinChannel(name) {
  channelName.textContent = "# " + name;
  ws.send(JSON.stringify({ type:"join", channel:name, user:username, avatar }));
}
