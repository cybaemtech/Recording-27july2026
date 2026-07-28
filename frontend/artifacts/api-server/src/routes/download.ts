import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

function findInstallerFile(platform: string): { filePath: string; fileName: string } | null {
  const normPlatform = platform.toLowerCase();
  // Find project root folder dynamically or via fixed path
  const projectRoot = path.resolve(process.cwd(), "..", "..", "..");

  const possibleRoots = [
    projectRoot,
    "c:\\inetpub\\wwwroot\\Screen recording",
    path.resolve(process.cwd(), "..", "..")
  ];

  if (normPlatform === "windows" || normPlatform === "win") {
    for (const root of possibleRoots) {
      const candidates = [
        path.join(root, "dist", "EMS Recorder Setup 1.0.0.exe"),
        path.join(root, "exe file", "EMS-Recorder-Windows", "EMS Recorder Setup 1.0.0.exe"),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          return { filePath: candidate, fileName: "EMS Recorder Setup 1.0.0.exe" };
        }
      }
    }
  } else if (normPlatform === "mac" || normPlatform === "macos" || normPlatform === "darwin") {
    for (const root of possibleRoots) {
      const candidates = [
        path.join(root, "dist", "EMS Recorder-1.0.0-arm64.dmg"),
        path.join(root, "dist", "EMS Recorder-1.0.0.dmg"),
        path.join(root, "dist", "EMS Recorder-1.0.0-arm64.zip"),
        path.join(root, "exe file", "EMS-Recorder-Mac", "EMS Recorder-1.0.0-arm64.dmg"),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          return { filePath: candidate, fileName: path.basename(candidate) };
        }
      }
    }
  }

  return null;
}

// Endpoint to download the agent installer for Windows or Mac
router.get("/download/agent/:platform", (req, res) => {
  const { platform } = req.params;
  const result = findInstallerFile(platform);

  if (!result) {
    console.error(`Installer file not found for platform: ${platform}`);
    res.status(404).json({
      error: `Installer file for ${platform} is not available on the server. Please build or upload the ${platform} package to the dist folder.`
    });
    return;
  }

  console.log(`Serving installer: ${result.filePath} for platform: ${platform}`);

  res.download(result.filePath, result.fileName, (err) => {
    if (err) {
      console.error("Error sending installer file:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error transferring installer file." });
      }
    }
  });
});

export default router;

