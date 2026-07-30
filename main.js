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
let registeredEmail = null;

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
      // Use the registered email from user_config.json
      if (!registeredEmail) {
        logToFile("[Supabase Live Sync] Error: registeredEmail is not set.");
        return;
      }
      
      logToFile(`[Supabase Live Sync] Device not found. Resolving user for registered email '${registeredEmail}'...`);

      const userSearchUrl = `${SUPABASE_URL}/rest/v1/users?select=id,name,email&email=eq.${encodeURIComponent(registeredEmail)}&limit=1`;
      const userSearchRes = await supabaseFetch(userSearchUrl, {
        method: "GET",
        headers: { "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "apikey": SUPABASE_ANON_KEY }
      }, "User search");

      const matchedUsers = await userSearchRes.json();
      if (matchedUsers && matchedUsers.length > 0) {
        userId = matchedUsers[0].id;
        logToFile(`[Supabase Live Sync] Matched user '${matchedUsers[0].name}' (ID: ${userId})`);
      } else {
        logToFile(`[Supabase Live Sync] ERROR: Registered email '${registeredEmail}' not found in database! User must be invited first.`);
        return; // Halt if the user doesn't exist
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
          body: JSON.stringify({ 
            duration_seconds: currentDuration,
            updated_at: new Date().toISOString()
          })
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

let activeTabState = {};

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h ${remM}m`;
}

function detectWebsiteName(title, proc) {
  const t = title.toLowerCase();
  if (t.includes("chatgpt") || t.includes("openai")) return "ChatGPT (chatgpt.com)";
  if (t.includes("github")) return "GitHub (github.com)";
  if (t.includes("google search") || t.includes("google")) return "Google Search";
  if (t.includes("youtube")) return "YouTube (youtube.com)";
  if (t.includes("stack overflow")) return "Stack Overflow";
  if (t.includes("outlook") || t.includes("mail")) return "Outlook Email";
  if (t.includes("teams")) return "Microsoft Teams";
  if (t.includes("figma")) return "Figma";
  if (t.includes("excel") || proc.toLowerCase().includes("excel")) return "Microsoft Excel";
  if (t.includes("word") || proc.toLowerCase().includes("winword")) return "Microsoft Word";
  if (t.includes("code") || proc.toLowerCase().includes("code")) return "VS Code";
  return `${proc} (${title.slice(0, 30)})`;
}

// Function to capture open window tabs & apps, calculate exact time used per website, and submit audit logs
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

        const userLabel = userInfo?.userId ? `User #${userInfo.userId}` : `Agent User (${hostname})`;
        const currentNow = Date.now();

        for (const w of windows) {
          if (!w.MainWindowTitle || w.MainWindowTitle.trim().length === 0) continue;
          
          const title = w.MainWindowTitle.trim();
          const proc = w.ProcessName || "Application";
          const websiteLabel = detectWebsiteName(title, proc);
          const key = `${proc}_${title}`;

          if (!activeTabState[key]) {
            activeTabState[key] = { startTime: currentNow, title, proc, websiteLabel };
          }

          const activeInfo = activeTabState[key];
          const timeUsedSec = Math.max(1, Math.floor((currentNow - activeInfo.startTime) / 1000));
          const timeUsedFormatted = formatDuration(timeUsedSec);

          const timeInStr = new Date(activeInfo.startTime).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
          const timeOutStr = new Date(currentNow).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

          const detailsStr = `Website/Tab: "${title}" (${websiteLabel}) | Time In: ${timeInStr} - Time Out: ${timeOutStr} | Time Used: ${timeUsedFormatted}`;

          // Submit to backend API audit log
          try {
            await supabaseFetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
              method: "POST",
              headers: { 
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
                "Prefer": "return=representation"
              },
              body: JSON.stringify({
                user: userLabel,
                user_id: userInfo?.userId || null,
                role: "User",
                device_name: hostname,
                module: "Website & Tab Activity",
                action: "Website / Tab Usage",
                status: "success",
                details: detailsStr,
                timestamp: new Date(currentNow).toISOString()
              })
            }, "Audit Log");
          } catch (e) {
            logToFile(`[Audit Log Upload Error] ${e.message}`);
          }
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
  });

  ipcMain.handle("check-registration", async () => {
    return registeredEmail;
  });

  ipcMain.handle("register-email", async (event, email) => {
    try {
      const trimmedEmail = email.trim();
      
      // Verify email exists in Supabase users table
      const userRes = await supabaseFetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(trimmedEmail)}&select=id`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "apikey": SUPABASE_ANON_KEY }
      }, "User Verification");
      
      const users = await userRes.json();

      if (!users || users.length === 0) {
        return { success: false, error: "This email address is not authorized. Please ask your administrator for an invite." };
      }

      registeredEmail = trimmedEmail;
      const configPath = path.join(app.getPath("userData"), "user_config.json");
      await fsPromises.writeFile(configPath, JSON.stringify({ email: registeredEmail }));
      // Immediately trigger live session and device creation now that we have an email
      await initializeLiveSessionAndDevice();
      return { success: true };
    } catch (err) {
      logToFile(`[Registration Error] ${err.message}`);
      return { success: false, error: err.message };
    }
  });

  // Load registered email on startup
  const configPath = path.join(app.getPath("userData"), "user_config.json");
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      registeredEmail = config.email || null;
    } catch (e) {
      console.error("Failed to read user_config.json", e);
    }
  }

  // If already registered, start syncing immediately
  if (registeredEmail) {
    initializeLiveSessionAndDevice();
  }

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
      
      const sessionToNotify = currentActiveSessionId;
      currentRecordingMetadata = null;
      currentActiveSessionId = null;

      if (sessionToNotify) {
        try {
          await fetch("http://localhost:3000/api/notify/closed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: sessionToNotify, type: "normal" })
          });
          logToFile("Sent normal close notification.");
        } catch (e) {
          logToFile("Failed to send close notification: " + e.message);
        }
      }
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