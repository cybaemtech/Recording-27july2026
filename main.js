const { app, BrowserWindow, desktopCapturer, ipcMain, powerMonitor } = require("electron");
const path = require("path");
const fs = require("fs");
const fsPromises = fs.promises;

let mainWindow;
let writeStream;
let isRecording = false;
let isClosing = false;
let currentRecordingMetadata = null;
let logFilePath = null;

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
        mainWindow.hide(); // Instantly hide the window so it feels closed
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

  ipcMain.handle("save-chunk", (event, buffer) => {
    if (writeStream && !writeStream.destroyed) {
      writeStream.write(Buffer.from(buffer));
    }
  });

  ipcMain.handle("finalize-recording", async () => {
    if (writeStream && !writeStream.destroyed) {
      await new Promise((resolve) => {
        writeStream.on("finish", resolve);
        writeStream.end();
      });
      writeStream = null;
    }
    isRecording = false;

    if (currentRecordingMetadata) {
      let dataDir;
      if (app.isPackaged) {
        dataDir = path.join(app.getPath("userData"), "data");
      } else {
        dataDir = path.join(__dirname, "frontend", "data");
      }
      const jsonPath = path.join(dataDir, "recordings.json");
      const durationSeconds = Math.floor((Date.now() - currentRecordingMetadata.startTime) / 1000);
      
      let recordings = [];
      try {
        const fileContent = await fsPromises.readFile(jsonPath, "utf-8");
        recordings = JSON.parse(fileContent);
      } catch (err) {
        // file doesn't exist or is invalid JSON, start fresh
      }
      
      const newId = recordings.length > 0 ? Math.max(...recordings.map(r => r.id || 0)) + 1 : 1;
      
      const newRecord = {
        id: newId,
        employeeId: "EMP001",
        employeeName: "Demo User",
        fileName: currentRecordingMetadata.fileName,
        filePath: currentRecordingMetadata.filePath,
        recordedAt: currentRecordingMetadata.recordedAt,
        duration: durationSeconds,
        status: "completed"
      };
      
      recordings.push(newRecord);
      
      try {
        if (app.isPackaged) {
          await fsPromises.mkdir(dataDir, { recursive: true });
        }
        await fsPromises.writeFile(jsonPath, JSON.stringify(recordings, null, 2));
      } catch (err) {
        console.error("Failed to write recordings metadata", err);
      }
      
      // Upload recording directly to Supabase cloud storage and database
      try {
        let absoluteFilePath;
        if (app.isPackaged) {
          absoluteFilePath = path.join(app.getPath("userData"), currentRecordingMetadata.filePath);
        } else {
          absoluteFilePath = path.join(__dirname, currentRecordingMetadata.filePath);
        }
        const fileBuffer = await fsPromises.readFile(absoluteFilePath);
        
        logToFile(`[Supabase Sync] Uploading ${newRecord.fileName} (${fileBuffer.length} bytes)...`);
        
        const SUPABASE_URL = "https://gidvoxfkdpxxujipchdz.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZHZveGZrZHB4eHVqaXBjaGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwOTIyNzUsImV4cCI6MjA5OTY2ODI3NX0.nbSHVEZbJaPSXHhMWhynZhKpB43VUp0VLYe1FauSQZo";
        const os = require("os");

        // Helper: make a Supabase REST call with retry
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
                logToFile(`[Supabase Sync] ${label} attempt ${attempt} failed, retrying in 3s: ${err.message}`);
                await new Promise(r => setTimeout(r, 3000));
              } else {
                throw err;
              }
            }
          }
        }

        // 1. Upload video file to Supabase Storage
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/recordings/${newRecord.fileName}`;
        await supabaseFetch(uploadUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "video/webm",
          },
          body: fileBuffer
        }, "Storage upload");

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/recordings/${newRecord.fileName}`;
        logToFile(`[Supabase Sync] Video uploaded successfully. URL: ${publicUrl}`);

        // 2. Identify/Create Device based on local hostname & resolve User
        const hostname = os.hostname();
        const platform = os.platform();
        let operatingSystem = "Windows";
        if (platform === "darwin") operatingSystem = "macOS";
        else if (platform === "linux") operatingSystem = "Linux";

        logToFile(`[Supabase Sync] Resolving device for hostname: ${hostname}...`);

        // Fetch device (including assigned user_id)
        const deviceUrl = `${SUPABASE_URL}/rest/v1/devices?name=eq.${encodeURIComponent(hostname)}&select=id,user_id`;
        const deviceFetchRes = await supabaseFetch(deviceUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "apikey": SUPABASE_ANON_KEY,
          }
        }, "Device lookup");

        let deviceId = null;
        let userId = null;
        const devices = await deviceFetchRes.json();

        if (devices && devices.length > 0) {
          deviceId = devices[0].id;
          userId = devices[0].user_id;
          logToFile(`[Supabase Sync] Found existing device id: ${deviceId} assigned to user_id: ${userId}`);
        } else {
          // Device doesn't exist yet: find primary user (by ascending ID order)
          logToFile(`[Supabase Sync] Device not found. Resolving primary user...`);
          const userFetchUrl = `${SUPABASE_URL}/rest/v1/users?select=id&order=id.asc&limit=1`;
          const userFetchRes = await supabaseFetch(userFetchUrl, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
              "apikey": SUPABASE_ANON_KEY,
            }
          }, "User lookup");

          const existingUsers = await userFetchRes.json();
          if (existingUsers && existingUsers.length > 0) {
            userId = existingUsers[0].id;
            logToFile(`[Supabase Sync] Found primary user with id: ${userId}`);
          } else {
            // Create default user if users table is empty
            logToFile(`[Supabase Sync] No user found, creating default user...`);
            const createUserUrl = `${SUPABASE_URL}/rest/v1/users`;
            const createUserRes = await supabaseFetch(createUserUrl, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
                "Prefer": "return=representation"
              },
              body: JSON.stringify({
                name: "Default User",
                email: "default@agent.local",
                password_hash: "agent-created",
                role: "user",
                is_online: true
              })
            }, "User creation");
            const newUsers = await createUserRes.json();
            userId = newUsers[0].id;
            logToFile(`[Supabase Sync] Created default user with id: ${userId}`);
          }

          // Create new device under resolved user
          logToFile(`[Supabase Sync] Creating new device record for hostname: ${hostname}...`);
          const createDeviceUrl = `${SUPABASE_URL}/rest/v1/devices`;
          const createDeviceRes = await supabaseFetch(createDeviceUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
              "apikey": SUPABASE_ANON_KEY,
              "Content-Type": "application/json",
              "Prefer": "return=representation"
            },
            body: JSON.stringify({
              user_id: userId,
              name: hostname,
              operating_system: operatingSystem,
              is_online: true,
              agent_version: "1.0.0",
              last_seen_at: new Date().toISOString()
            })
          }, "Device creation");

          const newDevices = await createDeviceRes.json();
          deviceId = newDevices[0].id;
          logToFile(`[Supabase Sync] Created device with id: ${deviceId}`);
        }

        // 4. Create Session record
        logToFile(`[Supabase Sync] Creating session record in database...`);
        const createSessionUrl = `${SUPABASE_URL}/rest/v1/sessions`;
        await supabaseFetch(createSessionUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify({
            user_id: userId,
            device_id: deviceId,
            login_time: new Date(newRecord.recordedAt).toISOString(),
            logout_time: new Date(new Date(newRecord.recordedAt).getTime() + newRecord.duration * 1000).toISOString(),
            duration_seconds: newRecord.duration,
            recording_size_bytes: fileBuffer.length,
            recording_url: publicUrl,
            upload_status: "completed",
            recording_status: "completed"
          })
        }, "Session creation");

        logToFile("[Supabase Sync] ✅ Successfully uploaded recording and synced database!");
        
        // Delete local recording file so it does not save on local computer!
        await fsPromises.unlink(absoluteFilePath);
        logToFile("Deleted local video file.");
      } catch (err) {
        logToFile(`[Supabase Sync] ❌ Sync failed: ${err.message}`);
      }
      
      currentRecordingMetadata = null;
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