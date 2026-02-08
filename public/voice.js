const voicePeers = {};
let localStream = null;
let currentVoice = null;

const wsVoiceSend = data => {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
};

/* ===== JOIN VOICE ===== */
async function joinVoice(channel) {
  if (currentVoice === channel) return;
  leaveVoice();

  currentVoice = channel;

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  wsVoiceSend({
    type: "voice-join",
    channel
  });
}

/* ===== LEAVE VOICE ===== */
function leaveVoice() {
  if (!currentVoice) return;

  wsVoiceSend({
    type: "voice-leave"
  });

  Object.values(voicePeers).forEach(pc => pc.close());
  Object.keys(voicePeers).forEach(k => delete voicePeers[k]);

  localStream?.getTracks().forEach(t => t.stop());
  localStream = null;
  currentVoice = null;
}

/* ===== CREATE PEER ===== */
function createPeer(id) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  voicePeers[id] = pc;

  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  pc.onicecandidate = e => {
    if (e.candidate) {
      wsVoiceSend({
        type: "voice-ice",
        to: id,
        candidate: e.candidate
      });
    }
  };

  pc.ontrack = e => {
    let audio = document.getElementById("voice-" + id);
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = "voice-" + id;
      audio.autoplay = true;
      document.body.appendChild(audio);
    }
    audio.srcObject = e.streams[0];
  };

  return pc;
}

/* ===== SIGNALING ===== */
ws.addEventListener("message", async e => {
  const d = JSON.parse(e.data);

  if (d.type === "voice-user") {
    const pc = createPeer(d.userId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    wsVoiceSend({
      type: "voice-offer",
      to: d.userId,
      offer
    });
  }

  if (d.type === "voice-offer") {
    const pc = createPeer(d.from);
    await pc.setRemoteDescription(d.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    wsVoiceSend({
      type: "voice-answer",
      to: d.from,
      answer
    });
  }

  if (d.type === "voice-answer") {
    await voicePeers[d.from]?.setRemoteDescription(d.answer);
  }

  if (d.type === "voice-ice") {
    await voicePeers[d.from]?.addIceCandidate(d.candidate);
  }
});
