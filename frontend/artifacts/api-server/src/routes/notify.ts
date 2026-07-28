import { Router } from "express";
import { db } from "@workspace/db";
import { sessionsTable, devicesTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import sendmailFactory from "sendmail";
import nodemailer from "nodemailer";

const router = Router();
const directSendmail = sendmailFactory({ silent: true });

async function getTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
}

router.post("/closed", async (req, res) => {
  try {
    const { sessionId, type } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const sessionData = await db.select({
      session: sessionsTable,
      user: usersTable,
      device: devicesTable,
    })
    .from(sessionsTable)
    .leftJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .leftJoin(devicesTable, eq(sessionsTable.deviceId, devicesTable.id))
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);

    if (sessionData.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const { user, device } = sessionData[0];
    const email = "Nikita.Nagargoje@cybaemtech.com";
    const empName = user?.name || "An employee";
    const devName = device?.name || "Unknown device";

    const reason = type === 'force' 
      ? "was forcefully closed (likely via Task Manager or system crash)"
      : "was closed normally";

    const htmlContent = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #e11d48;">Agent Monitoring Alert</h2>
        <p><strong>${empName}</strong> (Device: ${devName}) has stopped the monitoring agent.</p>
        <p>The application ${reason}.</p>
        <p style="font-size: 12px; color: #888;">Session ID: ${sessionId}</p>
      </div>
    `;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = await getTransporter();
      await transporter.sendMail({
        from: `"Cloud Session Recorder" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Agent Closed: ${empName}`,
        html: htmlContent,
      });
    } else {
      console.log("SMTP not configured. Using direct MX sendmail to deliver email to:", email);
      await new Promise<void>((resolve, reject) => {
        directSendmail({
          from: '"Cloud Session Recorder" <noreply@cybaemtech.com>',
          to: email,
          subject: `Agent Closed: ${empName}`,
          html: htmlContent,
        }, (err, reply) => {
          if (err) {
            console.error("Direct MX sendmail error:", err);
            resolve(); // Resolve anyway to avoid 500 error
          } else {
            console.log("Direct MX sendmail reply:", reply);
            resolve();
          }
        });
      });
    }

    res.json({ message: "Alert sent successfully" });
  } catch (error) {
    console.error("Error sending close alert:", error);
    res.status(500).json({ error: "Failed to send alert" });
  }
});

export default router;
