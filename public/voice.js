const voicePeers = {};
let localStream = null;
let currentVoice = null;

async function getMic() {
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }
  return localStream;
}

function createPeer(id) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  pc.onicecandidate = e => {
    if (e.candidate) {
      ws.send(JSON.stringify({
        type: "voice-ice",
        to: id,
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

  voicePeers[id] = pc;
  return pc;
}

async function joinVoice(name) {
  if (currentVoice === name) return;
  currentVoice = name;

  await getMic();

  ws.send(JSON.stringify({
    type: "voice-join",
    channel: name
  }));
}

function leaveVoice() {
  Object.values(voicePeers).forEach(p => p.close());
  for (const k in voicePeers) delete voicePeers[k];

  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }

  ws.send(JSON.stringify({ type: "voice-leave" }));
  currentVoice = null;
}

// ===== SIGNALING =====
ws.addEventListener("message", async e => {
  const data = JSON.parse(e.data);

  if (data.type === "voice-user") {
    const pc = createPeer(data.userId);
    (await getMic()).getTracks().forEach(t => pc.addTrack(t, localStream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    ws.send(JSON.stringify({
      type: "voice-offer",
      to: data.userId,
      offer
    }));
  }

  if (data.type === "voice-offer") {
    const pc = createPeer(data.from);
    await pc.setRemoteDescription(data.offer);
    (await getMic()).getTracks().forEach(t => pc.addTrack(t, localStream));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    ws.send(JSON.stringify({
      type: "voice-answer",
      to: data.from,
      answer
    }));
  }

  if (data.type === "voice-answer") {
    await voicePeers[data.from]?.setRemoteDescription(data.answer);
  }

  if (data.type === "voice-ice") {
    await voicePeers[data.from]?.addIceCandidate(data.candidate);
  }
});
