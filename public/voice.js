const voicePeers = {};
let localStream = null;
let currentVoiceChannel = null;

const voiceChannels = document.getElementById("voiceChannels");

// ===== UI: создать голосовой канал =====
function createVoiceChannel(name) {
  const div = document.createElement("div");
  div.className = "channel";
  div.textContent = "🔊 " + name;
  div.onclick = () => joinVoice(name);
  voiceChannels.appendChild(div);
}

// создаём дефолтный голосовой канал
createVoiceChannel("Общий");

// ===== WebRTC helpers =====
async function getMic() {
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }
  return localStream;
}

function createPeer(userId) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  pc.onicecandidate = e => {
    if (e.candidate) {
      ws.send(JSON.stringify({
        type: "voice-ice",
        to: userId,
        candidate: e.candidate
      }));
    }
  };

  pc.ontrack = e => {
    const audio = document.createElement("audio");
    audio.srcObject = e.streams[0];
    audio.autoplay = true;
    document.body.appendChild(audio);
  };

  voicePeers[userId] = pc;
  return pc;
}

// ===== JOIN VOICE =====
async function joinVoice(channel) {
  if (currentVoiceChannel === channel) return;

  currentVoiceChannel = channel;
  await getMic();

  ws.send(JSON.stringify({
    type: "voice-join",
    channel,
    user: username
  }));

  alert("🎙️ Вы подключились к голосовому каналу: " + channel);
}

// ===== LEAVE VOICE =====
function leaveVoice() {
  for (const id in voicePeers) {
    voicePeers[id].close();
    delete voicePeers[id];
  }

  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }

  ws.send(JSON.stringify({ type: "voice-leave" }));
  currentVoiceChannel = null;
}

// ===== SIGNALING =====
ws.addEventListener("message", async e => {
  const data = JSON.parse(e.data);

  // новый участник
  if (data.type === "voice-user" && data.channel === currentVoiceChannel) {
    const pc = createPeer(data.user);

    localStream.getTracks().forEach(t =>
      pc.addTrack(t, localStream)
    );

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    ws.send(JSON.stringify({
      type: "voice-offer",
      to: data.user,
      offer
    }));
  }

  // приняли offer
  if (data.type === "voice-offer") {
    const pc = createPeer(data.from);

    await pc.setRemoteDescription(data.offer);

    localStream.getTracks().forEach(t =>
      pc.addTrack(t, localStream)
    );

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    ws.send(JSON.stringify({
      type: "voice-answer",
      to: data.from,
      answer
    }));
  }

  // приняли answer
  if (data.type === "voice-answer") {
    const pc = voicePeers[data.from];
    if (pc) {
      await pc.setRemoteDescription(data.answer);
    }
  }

  // ICE
  if (data.type === "voice-ice") {
    const pc = voicePeers[data.from];
    if (pc) {
      await pc.addIceCandidate(data.candidate);
    }
  }
});
