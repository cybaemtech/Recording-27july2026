import { Router, type IRouter } from "express";
import { eq, ilike, sql, or } from "drizzle-orm";
import { db, usersTable, devicesTable, sessionsTable } from "@workspace/db";
import { ListUsersQueryParams, GetUserParams, InviteUserBody } from "@workspace/api-zod";
import nodemailer, { Transporter } from "nodemailer";
import sendmailFactory from "sendmail";

const directSendmail = sendmailFactory({
  silent: true,
});
const router: IRouter = Router();

let cachedTransporter: Transporter | null = null;
async function getTransporter(): Promise<Transporter> {
  if (cachedTransporter) return cachedTransporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    console.log("Creating Ethereal email test account... this may take a few seconds");
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("Using Ethereal email for testing");
  }
  
  return cachedTransporter;
}

router.get("/users", async (req, res): Promise<void> => {
  const parsed = ListUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 20, search } = parsed.data;
  const offset = (page - 1) * limit;

  const whereClause =
    search
      ? or(
          ilike(usersTable.name, `%${search}%`),
          ilike(usersTable.email, `%${search}%`)
        )
      : undefined;

  const [users, totalResult] = await Promise.all([
    db
      .select()
      .from(usersTable)
      .where(whereClause)
      .orderBy(usersTable.name)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(whereClause),
  ]);

  res.json({
    data: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isOnline: u.isOnline,
      avatarUrl: u.avatarUrl ?? null,
      department: u.department ?? null,
      lastSeenAt: u.lastSeenAt ?? null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    })),
    total: totalResult[0]?.count ?? 0,
    page,
    limit,
  });
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [deviceCountResult, sessionCountResult, storageResult] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(devicesTable)
      .where(eq(devicesTable.userId, user.id)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessionsTable)
      .where(eq(sessionsTable.userId, user.id)),
    db
      .select({ total: sql<number>`coalesce(sum(recording_size_bytes), 0)::bigint` })
      .from(sessionsTable)
      .where(eq(sessionsTable.userId, user.id)),
  ]);

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isOnline: user.isOnline,
    avatarUrl: user.avatarUrl ?? null,
    department: user.department ?? null,
    lastSeenAt: user.lastSeenAt ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deviceCount: deviceCountResult[0]?.count ?? 0,
    sessionCount: sessionCountResult[0]?.count ?? 0,
    totalStorageBytes: Number(storageResult[0]?.total ?? 0),
  });
});

router.post("/users/invite", async (req, res): Promise<void> => {
  const parsed = InviteUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, platform } = parsed.data;

  try {
    // Insert the user into the database if they don't already exist
    const name = email.split('@')[0].replace(/\./g, ' ');
    const capitalizedName = name.replace(/\b\w/g, c => c.toUpperCase());
    
    // Add invited user to the table with a placeholder password so they appear in the UI
    await db.insert(usersTable).values({
      name: capitalizedName,
      email: email,
      passwordHash: "INVITED_NO_PASSWORD", // Placeholder for invited users
      role: "user",
      isOnline: false,
    }).onConflictDoNothing({ target: usersTable.email });

    const protocol = req.protocol || "http";
    const host = req.get("host") || "localhost:5010";
    const downloadUrl = `${protocol}://${host}/api/download/agent/${platform}`;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #333;">You've been invited!</h2>
          <p style="color: #555; line-height: 1.5;">Please install the Cloud Session Recorder agent on your device.</p>
          <p style="color: #555;">Platform: <strong style="text-transform: capitalize;">${platform}</strong></p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${downloadUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Download Installer</a>
          </div>
          <p style="font-size: 12px; color: #888;">If the button doesn't work, copy this link into your browser: <br/><a href="${downloadUrl}" style="color: #4f46e5;">${downloadUrl}</a></p>
        </div>
      `;
    let previewUrl: string | false = false;
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = await getTransporter();
      const info = await transporter.sendMail({
        from: '"Cloud Session Recorder" <noreply@cybaemtech.com>',
        to: email,
        subject: "Invitation to Cloud Session Recorder Agent",
        text: `You have been invited to install the Cloud Session Recorder agent. Download the installer for ${platform} here: ${downloadUrl}`,
        html: htmlContent,
      });

      console.log("Message sent: %s", info.messageId);
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log("Preview URL: %s", previewUrl);
      }
    } else {
      console.log("SMTP not configured. Using direct MX sendmail to deliver email to:", email);
      await new Promise<void>((resolve, reject) => {
        directSendmail({
          from: '"Cloud Session Recorder" <noreply@cybaemtech.com>',
          to: email,
          subject: "Invitation to Cloud Session Recorder Agent",
          html: htmlContent,
        }, (err, reply) => {
          if (err) {
            console.error("Direct MX sendmail error:", err);
            reject(err);
          } else {
            console.log("Direct MX sendmail reply:", reply);
            resolve();
          }
        });
      });
    }

    res.json({ message: "Invitation sent successfully", previewUrl: previewUrl || undefined, downloadUrl });
  } catch (error) {
    console.error("Error sending invite email:", error);
    res.status(500).json({ error: "Failed to send invitation email." });
  }
});

export default router;
