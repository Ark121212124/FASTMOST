let localStream = null;
let currentVoice = null;
const peers = {};
let muted = false;
let deafened = false;

/* ===== VOICE ACTIVITY ===== */
let analyser = null;
let audioContext = null;

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

  startVoiceActivity();

  wsSend({
    type: "voice-join",
    channel
  });
}

/* ===== LEAVE VOICE ===== */
function leaveVoice() {
  if (!currentVoice) return;

  wsSend({ type: "voice-leave" });

  Object.values(peers).forEach(p => p.close());
  Object.keys(peers).forEach(k => delete peers[k]);

  localStream?.getTracks().forEach(t => t.stop());
  localStream = null;
  currentVoice = null;

  if (audioContext) {
    audioContext.close();
    audioContext = null;
    analyser = null;
  }
}

/* ===== PEER ===== */
function createPeer(id) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  peers[id] = pc;

  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

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
    let audio = document.getElementById("voice-" + id);
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = "voice-" + id;
      audio.autoplay = true;
      document.body.appendChild(audio);
    }
    audio.muted = deafened;
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
});

/* ===== VOICE ACTIVITY ===== */
function startVoiceActivity() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(localStream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);

  const data = new Uint8Array(analyser.frequencyBinCount);

  function detect() {
    analyser.getByteFrequencyData(data);
    const volume = data.reduce((a, b) => a + b, 0) / data.length;
    const speaking = volume > 25;

    wsSend({ type: "voice-activity", speaking });
    requestAnimationFrame(detect);
  }

  detect();
}

/* ===== MUTE ===== */
document.getElementById("muteBtn")?.addEventListener("click", () => {
  muted = !muted;
  localStream?.getAudioTracks().forEach(t => t.enabled = !muted);
  document.getElementById("muteBtn").textContent = muted ? "🔇" : "🎤";
});

/* ===== DEAFEN ===== */
document.getElementById("deafenBtn")?.addEventListener("click", () => {
  deafened = !deafened;
  document.querySelectorAll("audio").forEach(a => a.muted = deafened);
  document.getElementById("deafenBtn").textContent = deafened ? "🚫🎧" : "🎧";
});
