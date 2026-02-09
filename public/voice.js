let localStream = null;
let currentVoice = null;
const peers = {};

/* ===== CONFIG ===== */
const RTC_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

/* ===== HELPERS ===== */
function wsSend(data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
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

/* ===== LEAVE VOICE ===== */
function leaveVoice() {
  if (!currentVoice) return;

  wsSend({ type: "voice-leave" });

  Object.values(peers).forEach(pc => pc.close());
  Object.keys(peers).forEach(id => delete peers[id]);

  localStream?.getTracks().forEach(t => t.stop());
  localStream = null;
  currentVoice = null;
}

/* ===== CREATE PEER ===== */
function createPeer(id) {
  if (peers[id]) return peers[id];

  const pc = new RTCPeerConnection(RTC_CONFIG);
  peers[id] = pc;

  localStream.getTracks().forEach(track =>
    pc.addTrack(track, localStream)
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
