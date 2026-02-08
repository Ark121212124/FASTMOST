const protocol = location.protocol === "https:" ? "wss" : "ws";
const ws = new WebSocket(protocol + "://" + location.host);

const me = localStorage.getItem("username") || "user";

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "join",
    user: me
  }));
};

ws.onmessage = e => {
  const d = JSON.parse(e.data);

  if (d.type === "message") {
    messages.innerHTML += `<div>${d.user}: ${d.text}</div>`;
    messages.scrollTop = messages.scrollHeight;
  }

  if (d.type === "file") {
    messages.innerHTML += `<a href="${d.url}" target="_blank">${d.name}</a>`;
  }
};

function send() {
  ws.send(JSON.stringify({
    type: "message",
    user: me,
    text: msg.value
  }));
  msg.value = "";
}

function sendFile() {
  const f = file.files[0];
  const fd = new FormData();
  fd.append("file", f);

  fetch("/upload", {
    method: "POST",
    headers: { "x-user": me },
    body: fd
  });
}
