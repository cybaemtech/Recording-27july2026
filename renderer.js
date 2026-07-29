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

async function init() {
  const registeredEmail = await window.electronAPI.checkRegistration();
  
  const registerScreen = document.getElementById("register-screen");
  const recordingScreen = document.getElementById("recording-screen");
  
  if (registeredEmail) {
    // Already registered, show recording screen and start
    recordingScreen.classList.remove("hidden");
    startAutoRecording();
  } else {
    // Not registered, show registration form
    registerScreen.classList.remove("hidden");
    
    const form = document.getElementById("register-form");
    const emailInput = document.getElementById("email-input");
    const errorMsg = document.getElementById("error-message");
    const submitBtn = document.getElementById("submit-btn");
    
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = emailInput.value;
      if (!email) return;
      
      submitBtn.disabled = true;
      submitBtn.innerText = "Registering...";
      errorMsg.innerText = "";
      
      const result = await window.electronAPI.registerEmail(email);
      
      if (result.success) {
        registerScreen.classList.add("hidden");
        recordingScreen.classList.remove("hidden");
        startAutoRecording();
      } else {
        submitBtn.disabled = false;
        submitBtn.innerText = "Register Device";
        errorMsg.innerText = result.error || "Failed to register. Are you invited?";
      }
    });
  }
}

init();