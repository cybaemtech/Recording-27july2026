const { app, BrowserWindow, desktopCapturer, ipcMain, powerMonitor } = require("electron");
const path = require("path");
const fs = require("fs");
const fsPromises = fs.promises;
const os = require("os");

let mainWindow;
let writeStream;
let isRecording = false;
let isClosing = false;
let currentRecordingMetadata = null;
let logFilePath = null;
let currentActiveSessionId = null;
let heartbeatInterval = null;

const SUPABASE_URL = "https://gidvoxfkdpxxujipchdz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZHZveGZrZHB4eHVqaXBjaGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwOTIyNzUsImV4cCI6MjA5OTY2ODI3NX0.nbSHVEZbJaPSXHhMWhynZhKpB43VUp0VLYe1FauSQZo";

function logToFile(message) {
  try {
    if (!logFilePath && app.isReady()) {
      const baseDir = app.isPackaged ? app.getPath("userData") : __dirname;
      const dataDir = path.join(baseDir, app.isPackaged ? "data" : "frontend/data");
      fs.mkdirSync(dataDir, { recursive: true });
      logFilePath = path.join(dataDir, "log.txt");
    }
    if (logFilePath) {
      const timestamp = new Date().toISOString();
      fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`);
    }
  } catch (err) {
    console.error("Failed to log to file:", err);
  }
  console.log(message);
}

function getTimestamp() {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

async function supabaseFetch(url, options, label) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`${label} failed (HTTP ${res.status}): ${errText}`);
      }
      return res;
    } catch (err) {
      if (attempt < 2) {
        logToFile(`[Supabase Sync] ${label} attempt ${attempt} failed, retrying in 2s: ${err.message}`);
        await new Promise(r => setTimeout(r, 2000));
      } else {
        throw err;
      }
    }
  }
}

// Function to initialize active live session & device immediately in Supabase on app launch / start recording
async function initializeLiveSessionAndDevice() {
  try {
    const hostname = os.hostname();
    const platform = os.platform();
    let operatingSystem = "Windows";
    if (platform === "darwin") operatingSystem = "macOS";
    else if (platform === "linux") operatingSystem = "Linux";

    logToFile(`[Supabase Live Sync] Initializing live device & session for hostname: ${hostname}...`);

    // 1. Resolve Device
    const deviceUrl = `${SUPABASE_URL}/rest/v1/devices?name=eq.${encodeURIComponent(hostname)}&select=id,user_id`;
    const deviceFetchRes = await supabaseFetch(deviceUrl, {
      method: "GET",
      headers: { "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "apikey": SUPABASE_ANON_KEY }
    }, "Device lookup");

    let deviceId = null;
    let userId = null;
    const devices = await deviceFetchRes.json();

    if (devices && devices.length > 0) {
      deviceId = devices[0].id;
      userId = devices[0].user_id;
      logToFile(`[Supabase Live Sync] Found existing device id: ${deviceId} (User ID: ${userId})`);

      // Update device online status
      await supabaseFetch(`${SUPABASE_URL}/rest/v1/devices?id=eq.${deviceId}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ is_online: true, last_seen_at: new Date().toISOString() })
      }, "Device update");
    } else {
      // Resolve user matching local OS username or recent invited user
      const osUser = (os.userInfo() ? os.userInfo().username : hostname).toLowerCase();
      logToFile(`[Supabase Live Sync] Device not found. Resolving user for OS user '${osUser}'...`);

      const userSearchUrl = `${SUPABASE_URL}/rest/v1/users?select=id,name,email&or=(email.ilike.*${encodeURIComponent(osUser)}*,name.ilike.*${encodeURIComponent(osUser)}*)&limit=1`;
      const userSearchRes = await supabaseFetch(userSearchUrl, {
        method: "GET",
        headers: { "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "apikey": SUPABASE_ANON_KEY }
      }, "User search");

      const matchedUsers = await userSearchRes.json();
      if (matchedUsers && matchedUsers.length > 0) {
        userId = matchedUsers[0].id;
        logToFile(`[Supabase Live Sync] Matched user '${matchedUsers[0].name}' (ID: ${userId})`);
      } else {
        // Check for recent invited user (role = 'user')
        const invitedSearchUrl = `${SUPABASE_URL}/rest/v1/users?select=id,name,email&role=eq.user&order=id.desc&limit=1`;
        const invitedSearchRes = await supabaseFetch(invitedSearchUrl, {
          method: "GET",
          headers: { "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "apikey": SUPABASE_ANON_KEY }
        }, "Invited user lookup");
        const invitedUsers = await invitedSearchRes.json();

        if (invitedUsers && invitedUsers.length > 0) {
          userId = invitedUsers[0].id;
          logToFile(`[Supabase Live Sync] Assigned to invited user '${invitedUsers[0].name}' (ID: ${userId})`);
        } else {
          // Create user profile for this OS user
          const formattedName = osUser.replace(/[\._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const createUserRes = await supabaseFetch(`${SUPABASE_URL}/rest/v1/users`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "apikey": SUPABASE_ANON_KEY,
              "Content-Type": "application/json", "Prefer": "return=representation"
            },
            body: JSON.stringify({
              name: formattedName,
              email: `${osUser.replace(/[^a-z0-9]/g, '')}@cybaemtech.com`,
              password_hash: "agent-created", role: "user", is_online: true
            })
          }, "User creation");
          const newUsers = await createUserRes.json();
          userId = newUsers[0].id;
          logToFile(`[Supabase Live Sync] Created user '${formattedName}' (ID: ${userId})`);
        }
      }

      // Create new device record
      const createDeviceRes = await supabaseFetch(`${SUPABASE_URL}/rest/v1/devices`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "apikey": SUPABASE_ANON_KEY,
          "Content-Type": "application/json", "Prefer": "return=representation"
        },
        body: JSON.stringify({
          user_id: userId, name: hostname, operating_system: operatingSystem,
          is_online: true, agent_version: "1.0.0", last_seen_at: new Date().toISOString()
        })
      }, "Device creation");
      const newDevices = await createDeviceRes.json();
      deviceId = newDevices[0].id;
      logToFile(`[Supabase Live Sync] Created device '${hostname}' (ID: ${deviceId})`);
    }

    // Mark User as Online in DB
    if (userId) {
      await supabaseFetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ is_online: true, last_seen_at: new Date().toISOString() })
      }, "User online status update");
    }

    // 2. Create Active Live Session Record Immediately
    logToFile(`[Supabase Live Sync] Creating live active session record in database...`);
    const createSessionRes = await supabaseFetch(`${SUPABASE_URL}/rest/v1/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json", "Prefer": "return=representation"
      },
      body: JSON.stringify({
        user_id: userId,
        device_id: deviceId,
        login_time: new Date().toISOString(),
        duration_seconds: 0,
        upload_status: "recording",
        recording_status: "recording"
      })
    }, "Live session creation");

    const createdSessions = await createSessionRes.json();
    if (createdSessions && createdSessions.length > 0) {
      currentActiveSessionId = createdSessions[0].id;
      logToFile(`[Supabase Live Sync] 🟢 Live session active in DB! Session ID: ${currentActiveSessionId}`);
    }

    // Log Initial Audit Entry for session start with open tabs
    const startTime = Date.now();
    captureAndLogOpenTabs({ userId, deviceId }, hostname, startTime, "Agent Started & Recording");

    // 3. Start Heartbeat Timer (Updates duration, last_seen & active window tabs every 10s)
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(async () => {
      if (!isRecording || !currentActiveSessionId) return;
      const currentDuration = Math.floor((Date.now() - startTime) / 1000);
      try {
        // Update Session duration
        await supabaseFetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${currentActiveSessionId}`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ duration_seconds: currentDuration })
        }, "Session heartbeat");

        // Update Device last_seen_at
        if (deviceId) {
          await supabaseFetch(`${SUPABASE_URL}/rest/v1/devices?id=eq.${deviceId}`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ is_online: true, last_seen_at: new Date().toISOString() })
          }, "Device heartbeat");
        }

        // Capture open window tabs & apps periodically
        captureAndLogOpenTabs({ userId, deviceId }, hostname, Date.now(), "Tab / Window Active");
      } catch (e) {
        logToFile(`[Heartbeat Error] ${e.message}`);
      }
    }, 10000);

    return { deviceId, userId };
  } catch (err) {
    logToFile(`[Supabase Live Sync Error] ${err.message}`);
    return null;
  }
}

// Function to capture open window tabs & apps and post audit logs
async function captureAndLogOpenTabs(userInfo, hostname, eventTime, actionName) {
  try {
    const { execFile } = require("child_process");
    const psScript = `
      Get-Process | Where-Object { $_.MainWindowTitle -and $_.MainWindowTitle.Trim().Length -gt 0 } | Select-Object ProcessName, MainWindowTitle | ConvertTo-Json
    `;

    execFile("powershell.exe", ["-NoProfile", "-Command", psScript], async (err, stdout) => {
      if (err || !stdout) return;
      try {
        let windows = JSON.parse(stdout);
        if (!Array.isArray(windows)) windows = [windows];

        const timeInStr = new Date(eventTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        const timeOutStr = new Date(Date.now() + 10000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        
        // Find user name
        const userLabel = userInfo?.userId ? `User #${userInfo.userId}` : `Agent User (${hostname})`;

        for (const w of windows) {
          if (!w.MainWindowTitle || w.MainWindowTitle.trim().length === 0) continue;
          
          const title = w.MainWindowTitle.trim();
          const proc = w.ProcessName || "Application";
          const detailsStr = `Open Tab/App: "${title}" (${proc}) | Time In: ${timeInStr} - Time Out: ${timeOutStr} (Active)`;

          // Submit to backend API audit log
          try {
            await fetch("http://localhost:5010/api/audit-logs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user: userLabel,
                role: "User",
                deviceName: hostname,
                module: "Applications & Tabs",
                action: actionName || "Tab Open",
                status: "success",
                details: detailsStr
              })
            });
          } catch (e) {}
        }
      } catch (e) {
        logToFile(`[Audit Tab Capture Error] ${e.message}`);
      }
    });
  } catch (err) {
    logToFile(`[Audit Tab Error] ${err.message}`);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile("index.html");

  mainWindow.on("close", (e) => {
    if (isRecording) {
      e.preventDefault();
      if (!isClosing) {
        isClosing = true;
        mainWindow.hide();
        mainWindow.webContents.send("stop-recording");
      }
    }
  });
}

app.whenReady().then(() => {
  app.setLoginItemSettings({ openAtLogin: true });

  ipcMain.handle("get-sources", async () => {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 0, height: 0 },
    });
    return sources.map((s) => ({ id: s.id, name: s.name }));
  });

  ipcMain.handle("start-recording-file", async () => {
    const fileName = `${getTimestamp()}.webm`;
    let dataDir, relativeFilePath;
    
    if (app.isPackaged) {
      dataDir = path.join(app.getPath("userData"), "data");
      relativeFilePath = path.join("data", "recordings", fileName);
    } else {
      dataDir = path.join(__dirname, "frontend", "data");
      relativeFilePath = `frontend/data/recordings/${fileName}`;
    }
    
    const recordingsDir = path.join(dataDir, "recordings");
    
    try {
      await fsPromises.mkdir(recordingsDir, { recursive: true });
    } catch (err) {
      if (err.code !== "EEXIST") console.error(err);
    }
    
    const filePath = path.join(recordingsDir, fileName);
    
    currentRecordingMetadata = {
      fileName,
      filePath: relativeFilePath,
      recordedAt: new Date().toISOString(),
      startTime: Date.now()
    };

    writeStream = fs.createWriteStream(filePath);
    isRecording = true;

    // Immediately trigger live session and device creation in Supabase!
    initializeLiveSessionAndDevice();
  });

  ipcMain.handle("save-chunk", (event, buffer) => {
    if (writeStream && !writeStream.destroyed) {
      writeStream.write(Buffer.from(buffer));
    }
  });

  ipcMain.handle("finalize-recording", async () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    if (writeStream && !writeStream.destroyed) {
      await new Promise((resolve) => {
        writeStream.on("finish", resolve);
        writeStream.end();
      });
      writeStream = null;
    }
    isRecording = false;

    if (currentRecordingMetadata) {
      const durationSeconds = Math.floor((Date.now() - currentRecordingMetadata.startTime) / 1000);
      
      // Upload recording directly to Supabase cloud storage and update session in DB
      try {
        let absoluteFilePath;
        if (app.isPackaged) {
          absoluteFilePath = path.join(app.getPath("userData"), currentRecordingMetadata.filePath);
        } else {
          absoluteFilePath = path.join(__dirname, currentRecordingMetadata.filePath);
        }
        const fileBuffer = await fsPromises.readFile(absoluteFilePath);
        
        logToFile(`[Supabase Sync] Uploading ${currentRecordingMetadata.fileName} (${fileBuffer.length} bytes)...`);

        // 1. Upload video file to Supabase Storage
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/recordings/${currentRecordingMetadata.fileName}`;
        await supabaseFetch(uploadUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "video/webm",
          },
          body: fileBuffer
        }, "Storage upload");

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/recordings/${currentRecordingMetadata.fileName}`;
        logToFile(`[Supabase Sync] Video uploaded successfully. URL: ${publicUrl}`);

        // 2. Update existing Session record or create if not exists
        if (currentActiveSessionId) {
          logToFile(`[Supabase Sync] Updating session ID ${currentActiveSessionId} to completed...`);
          await supabaseFetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${currentActiveSessionId}`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({
              logout_time: new Date().toISOString(),
              duration_seconds: durationSeconds,
              recording_size_bytes: fileBuffer.length,
              recording_url: publicUrl,
              upload_status: "completed",
              recording_status: "completed"
            })
          }, "Session completion patch");
        }

        logToFile("[Supabase Sync] ✅ Successfully uploaded recording and updated session database!");
        
        // Delete local recording file so local disk space stays clean
        await fsPromises.unlink(absoluteFilePath);
        logToFile("Deleted local video file.");
      } catch (err) {
        logToFile(`[Supabase Sync] ❌ Sync failed: ${err.message}`);
      }
      
      currentRecordingMetadata = null;
      currentActiveSessionId = null;
    }

    if (isClosing) {
      app.quit();
    }
  });

  powerMonitor.on("suspend", () => {
    if (isRecording && mainWindow) {
      mainWindow.webContents.send("pause-recording");
    }
  });

  powerMonitor.on("resume", () => {
    if (isRecording && mainWindow) {
      mainWindow.webContents.send("resume-recording");
    }
  });

  createWindow();
});

app.on("before-quit", (e) => {
  if (isRecording && !isClosing) {
    e.preventDefault();
    isClosing = true;
    if (mainWindow) {
      mainWindow.webContents.send("stop-recording");
    }
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});