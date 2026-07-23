import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

// Endpoint to download the agent installer
router.get("/download/agent/:platform", (req, res) => {
  const { platform } = req.params;
  
  // Define mapping of platform to directory and filename
  const platformMapping: Record<string, { dir: string, file: string }> = {
    windows: { dir: "EMS-Recorder-Windows", file: "EMS Recorder Setup 1.0.0.exe" },
    mac: { dir: "EMS-Recorder-Mac", file: "EMS Recorder-1.0.0-arm64.dmg" }
  };

  const target = platformMapping[platform.toLowerCase()];
  
  if (!target) {
    res.status(400).json({ error: "Invalid platform requested. Allowed values: 'windows', 'mac'." });
    return;
  }

  // The exe files are located at c:\inetpub\wwwroot\Screen recording\exe file
  const exeFolderPath = path.join(process.cwd(), "..", "..", "..", "exe file", target.dir, target.file);

  if (!fs.existsSync(exeFolderPath)) {
    console.error(`File not found at: ${exeFolderPath}`);
    res.status(404).json({ error: "Installer file not found on the server." });
    return;
  }

  res.download(exeFolderPath, target.file, (err) => {
    if (err) {
      console.error("Error downloading file:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file." });
      }
    }
  });
});

export default router;
