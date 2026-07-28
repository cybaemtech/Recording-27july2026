import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import { signUserToken } from "../lib/jwt.js";
import { logAuditEvent } from "./audit-logs.js";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  let user: any = null;

  if (process.env.DATABASE_URL) {
    try {
      const [dbUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);
      if (dbUser && dbUser.passwordHash === password) {
        user = dbUser;
      }
    } catch (err) {
      console.error("[Auth] Database select error:", err);
    }
  } else {
    // Development mode fallback when DATABASE_URL is not set
    if ((email === "admin" || email === "admin@acmecorp.com" || email === "admin@monitorpro.io") && password === "admin123") {
      user = {
        id: 1,
        name: "Admin User",
        email: "admin@acmecorp.com",
        role: "admin",
        passwordHash: "admin123",
        avatarUrl: null
      };
    }
  }

  if (!user) {
    await logAuditEvent({
      user: email,
      role: "Unknown",
      module: "Authentication",
      action: "Admin Login Failed",
      status: "failed",
      details: `Failed authentication attempt for ${email}`
    });
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (process.env.DATABASE_URL) {
    try {
      await db
        .update(usersTable)
        .set({ lastSeenAt: new Date(), isOnline: true })
        .where(eq(usersTable.id, user.id));
    } catch (err) {}
  }


  const token = await signUserToken(user.id, user.email, user.role);

  await logAuditEvent({
    user: `${user.name} (${user.email})`,
    role: user.role,
    module: "Authentication",
    action: "Admin Login",
    status: "success",
    details: `User ${user.email} authenticated successfully as ${user.role}`
  });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
    },
  });
});

export default router;

