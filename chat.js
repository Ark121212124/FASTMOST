import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const roomId = new URLSearchParams(location.search).get("room");
const messagesRef = collection(db, "rooms", roomId, "messages");

const messages = document.getElementById("messages");
const input = document.getElementById("messageInput");

document.getElementById("sendBtn").onclick = sendMessage;
input.addEventListener("keydown", e => e.key === "Enter" && sendMessage());

async function sendMessage(text = input.value){
  if(!text.trim()) return;
  await addDoc(messagesRef, {
    text,
    created: serverTimestamp(),
    user: "Guest"
  });
  input.value = "";
}

onSnapshot(
  query(messagesRef, orderBy("created")),
  snap => {
    messages.innerHTML = "";
    snap.forEach(doc=>{
      const div = document.createElement("div");
      div.className = "message";
      div.textContent = doc.data().text;
      messages.appendChild(div);
    });
    messages.scrollTop = messages.scrollHeight;
  }
);

/* EMOJI */
document.getElementById("emojiBtn").onclick = ()=>{
  emojiPanel.hidden = !emojiPanel.hidden;
  gifPanel.hidden = true;
};

document.querySelector("emoji-picker")
  .addEventListener("emoji-click", e=>{
    input.value += e.detail.unicode;
  });

/* GIF */
document.getElementById("gifBtn").onclick = ()=>{
  gifPanel.hidden = !gifPanel.hidden;
  emojiPanel.hidden = true;
};

document.querySelectorAll("#gifPanel img").forEach(img=>{
  img.onclick = ()=> sendMessage(img.src);
});
