let mediaRecorder;

async function startAutoRecording() {
  try {
    const sources = await window.electronAPI.getSources();
    if (!sources || sources.length === 0) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: sources[0].id
        }
      }
    });

    await window.electronAPI.startRecordingFile();

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm; codecs=vp9"
    });

    mediaRecorder.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        const buffer = await e.data.arrayBuffer();
        await window.electronAPI.saveChunk(buffer);
      }
    };

    mediaRecorder.onstop = async () => {
      await window.electronAPI.finalizeRecording();
    };

    mediaRecorder.start(1000);
  } catch (error) {
    console.error("Error starting recording:", error);
  }
}

window.electronAPI.onStopRecording(() => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
});

window.electronAPI.onPauseRecording(() => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.pause();
  }
});

window.electronAPI.onResumeRecording(() => {
  if (mediaRecorder && mediaRecorder.state === "paused") {
    mediaRecorder.resume();
  }
});

startAutoRecording();