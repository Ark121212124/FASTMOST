let localStream = null;
let currentVoice = null;
let muted = false;
let deafened = false;

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

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  startVoiceActivity();
}

/* ===== LEAVE ===== */
function leaveVoice() {
  if (!currentVoice) return;
  currentVoice = null;

  localStream?.getTracks().forEach(t => t.stop());
  localStream = null;

  audioContext?.close();
  audioContext = null;
}

/* ===== VOICE ACTIVITY ===== */
function startVoiceActivity() {
  audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(localStream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);

  const data = new Uint8Array(analyser.frequencyBinCount);

  function detect() {
    analyser.getByteFrequencyData(data);
    const volume = data.reduce((a, b) => a + b, 0) / data.length;
    wsSend({ type: "voice-activity", speaking: volume > 25 });
    requestAnimationFrame(detect);
  }

  detect();
}

/* ===== MUTE ===== */
document.getElementById("muteBtn")?.addEventListener("click", () => {
  muted = !muted;
  localStream?.getAudioTracks().forEach(t => t.enabled = !muted);
});

/* ===== DEAFEN ===== */
document.getElementById("deafenBtn")?.addEventListener("click", () => {
  deafened = !deafened;
  document.querySelectorAll("audio").forEach(a => a.muted = deafened);
});
