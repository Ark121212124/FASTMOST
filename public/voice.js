let localStream = null;
let currentVoice = null;
const peers = {};

/* ===== HELPERS ===== */
function wsSend(data) {
  ws.readyState === 1 && ws.send(JSON.stringify(data));
}

/* ===== JOIN VOICE ===== */
async function joinVoice(channel) {
  if (currentVoice === channel) return;
  leaveVoice();

  currentVoice = channel;

  localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });

  wsSend({ type: "voice-join", channel });
}

/* ===== LEAVE ===== */
function leaveVoice() {
  if (!currentVoice) return;

  wsSend({ type: "voice-leave" });

  Object.values(peers).forEach(pc => pc.close());
  Object.keys(peers).forEach(k => delete peers[k]);

  localStream?.getTracks().forEach(t => t.stop());
  localStream = null;
  currentVoice = null;
}

/* ===== PEER ===== */
function createPeer(id) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  peers[id] = pc;

  localStream.getTracks().forEach(t =>
    pc.addTrack(t, localStream)
  );

  pc.onicecandidate = e => {
    if (e.candidate) {
      wsSend({
        type: "voice-ice",
        to: id,
        candidate: e.candidate
      });
    }
  };

  pc.ontrack = e => {
    let audio = document.getElementById("audio-" + id);
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = "audio-" + id;
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

  if (d.type === "voice-users") {
    for (const u of d.users) {
      const pc = createPeer(u.id);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      wsSend({
        type: "voice-offer",
        to: u.id,
        offer
      });
    }
  }

  if (d.type === "voice-user-joined") {
    const pc = createPeer(d.userId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    wsSend({
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

    wsSend({
      type: "voice-answer",
      to: d.from,
      answer
    });
  }

  if (d.type === "voice-answer") {
    await peers[d.from]?.setRemoteDescription(d.answer);
  }

  if (d.type === "voice-ice") {
    await peers[d.from]?.addIceCandidate(d.candidate);
  }

  if (d.type === "voice-user-left") {
    peers[d.userId]?.close();
    delete peers[d.userId];
    document.getElementById("audio-" + d.userId)?.remove();
  }
});
