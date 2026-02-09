let localStream = null;
let currentVoice = null;

function wsSend(d) {
  ws.readyState === 1 && ws.send(JSON.stringify(d));
}

async function joinVoice(channel) {
  if (currentVoice === channel) return;
  leaveVoice();
  currentVoice = channel;

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  wsSend({ type: "voice-join", channel });

  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(localStream);
  const analyser = ctx.createAnalyser();
  src.connect(analyser);

  const data = new Uint8Array(analyser.frequencyBinCount);
  (function detect() {
    analyser.getByteFrequencyData(data);
    const speaking = data.reduce((a,b)=>a+b,0)/data.length > 20;
    wsSend({ type: "voice-activity", speaking });
    requestAnimationFrame(detect);
  })();
}

function leaveVoice() {
  if (!currentVoice) return;
  wsSend({ type: "voice-leave" });
  currentVoice = null;
  localStream?.getTracks().forEach(t => t.stop());
}
