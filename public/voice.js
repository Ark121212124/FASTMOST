let stream;
let peer;
let audio;

async function startVoice() {
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  peer = new RTCPeerConnection();
  stream.getTracks().forEach(t => peer.addTrack(t, stream));

  peer.ontrack = e => {
    audio = document.createElement("audio");
    audio.srcObject = e.streams[0];
    audio.autoplay = true;
    document.body.appendChild(audio);
  };

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);

  ws.send(JSON.stringify({
    type: "voice-offer",
    offer
  }));
}

ws.onmessage = async e => {
  const data = JSON.parse(e.data);

  if (data.type === "voice-offer") {
    peer = new RTCPeerConnection();
    peer.ontrack = e => {
      audio = document.createElement("audio");
      audio.srcObject = e.streams[0];
      audio.autoplay = true;
      document.body.appendChild(audio);
    };

    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => peer.addTrack(t, stream));

    await peer.setRemoteDescription(data.offer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    ws.send(JSON.stringify({
      type: "voice-answer",
      answer
    }));
  }

  if (data.type === "voice-answer") {
    await peer.setRemoteDescription(data.answer);
  }
};
