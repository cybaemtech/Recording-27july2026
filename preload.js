const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getSources: () => ipcRenderer.invoke("get-sources"),
  startRecordingFile: () => ipcRenderer.invoke("start-recording-file"),
  saveChunk: (buffer) => ipcRenderer.invoke("save-chunk", buffer),
  finalizeRecording: () => ipcRenderer.invoke("finalize-recording"),
  onStopRecording: (callback) => ipcRenderer.on("stop-recording", callback),
  onPauseRecording: (callback) => ipcRenderer.on("pause-recording", callback),
  onResumeRecording: (callback) => ipcRenderer.on("resume-recording", callback)
});