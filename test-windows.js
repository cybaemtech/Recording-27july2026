const { execFile } = require("child_process");

const psScript = `
Get-Process | Where-Object { $_.MainWindowTitle -and $_.MainWindowTitle.Trim().Length -gt 0 } | Select-Object ProcessName, MainWindowTitle, Id | ConvertTo-Json
`;

execFile("powershell.exe", ["-NoProfile", "-Command", psScript], (err, stdout) => {
  if (err) {
    console.error("Error:", err);
    return;
  }
  try {
    const list = JSON.parse(stdout);
    console.log("Open Window Tabs & Applications:", list);
  } catch (e) {
    console.log("Raw output:", stdout);
  }
});
