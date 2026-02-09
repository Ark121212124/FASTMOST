let localStream = null;
let currentVoice = null;
let muted = false;

function wsSend(d) {
  if (ws.readyState === 1) ws.send(JSON.stringify(d));
}

async function joinVoice(channel) {
  if (currentVoice === channel) return;

  leaveVoice();
  currentVoice = channel;

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  wsSend({ type: "voice-join", channel });
  startVoiceActivity();
}

function leaveVoice() {
  if (!currentVoice) return;
  wsSend({ type: "voice-leave" });
  localStream?.getTracks().forEach(t => t.stop());
  localStream = null;
  currentVoice = null;
}

function startVoiceActivity() {
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(localStream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  src.connect(analyser);

  const data = new Uint8Array(analyser.frequencyBinCount);

  function tick() {
    analyser.getByteFrequencyData(data);
    const v = data.reduce((a,b)=>a+b,0)/data.length;
    wsSend({ type: "voice-activity", speaking: v > 25 });
    requestAnimationFrame(tick);
  }
  tick();
}

document.getElementById("muteBtn")?.addEventListener("click", () => {
  muted = !muted;
  localStream?.getAudioTracks().forEach(t => t.enabled = !muted);
});
