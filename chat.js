// ===============================
// ELEMENTS
// ===============================
const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const emojiBtn = document.getElementById("emojiBtn");
const emojiPanel = document.getElementById("emojiPanel");

const gifBtn = document.getElementById("gifBtn");
const gifPanel = document.getElementById("gifPanel");

// ===============================
// SAFE SEND MESSAGE
// ===============================
function sendMessage(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return;

  addMessageToUI(text);

  // 🔥 Firebase (если подключён)
  if (window.saveMessageToFirebase) {
    window.saveMessageToFirebase(text);
  }

  messageInput.value = "";
}

// ===============================
// UI MESSAGE
// ===============================
function addMessageToUI(html) {
  const msg = document.createElement("div");
  msg.className = "message me";
  msg.innerHTML = html;

  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
}

// ===============================
// BUTTONS / INPUT
// ===============================
sendBtn.onclick = () => {
  sendMessage(messageInput.value);
};

messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage(messageInput.value);
  }
});

// ===============================
// EMOJI
// ===============================
if (emojiBtn && emojiPanel) {
  emojiBtn.onclick = () => {
    emojiPanel.classList.toggle("hidden");
    gifPanel?.classList.add("hidden");
  };

  const picker = emojiPanel.querySelector("emoji-picker");
  if (picker) {
    picker.addEventListener("emoji-click", e => {
      messageInput.value += e.detail.unicode;
      messageInput.focus();
    });
  }
}

// ===============================
// GIF
// ===============================
if (gifBtn && gifPanel) {
  gifBtn.onclick = () => {
    gifPanel.classList.toggle("hidden");
    emojiPanel?.classList.add("hidden");
  };

  gifPanel.querySelectorAll("img").forEach(img => {
    img.onclick = () => {
      sendMessage(`<img src="${img.src}" class="gif">`);
      gifPanel.classList.add("hidden");
    };
  });
}

// ===============================
// CLICK OUTSIDE → CLOSE PANELS
// ===============================
document.addEventListener("click", e => {
  if (!emojiPanel.contains(e.target) && e.target !== emojiBtn) {
    emojiPanel.classList.add("hidden");
  }
  if (!gifPanel.contains(e.target) && e.target !== gifBtn) {
    gifPanel.classList.add("hidden");
  }
});
