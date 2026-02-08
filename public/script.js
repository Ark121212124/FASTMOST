const ws = new WebSocket(
  (location.protocol === "https:" ? "wss://" : "ws://") + location.host
);

const messages = document.getElementById("messages");

ws.onmessage = e => {
  const d = document.createElement("div");
  d.textContent = e.data;
  messages.appendChild(d);
};

function send() {
  if (!msg.value) return;
  ws.send(msg.value);
  msg.value = "";
}

async function sendFile() {
  if (!file.files[0]) return;
  const f = new FormData();
  f.append("file", file.files[0]);
  await fetch("/upload", { method: "POST", body: f });
}
