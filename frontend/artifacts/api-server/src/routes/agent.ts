/**
 * Agent registration and authentication endpoints.
 *
 * Workflow:
 *   1. POST /agent/register  → returns deviceId + apiToken (store in agent config)
 *   2. POST /agent/login     → exchange deviceId + apiToken for a short-lived JWT
 *   3. Use JWT as Bearer token on all subsequent /session/*, /recording/*, /device/* calls
 */
import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, devicesTable, usersTable } from "@workspace/db";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { signAgentToken } from "../lib/jwt.js";

const router: IRouter = Router();

const RegisterBody = z.object({
  hostname: z.string().min(1).max(255),
  operatingSystem: z.enum(["Windows", "macOS", "Linux"]),
  agentVersion: z.string().min(1).max(50),
  userId: z.coerce.number().int().positive(),
  registrationKey: z.string().optional(), // reserved for future pre-shared key validation
});

const LoginBody = z.object({
  deviceId: z.coerce.number().int().positive(),
  apiToken: z.string().min(10),
});

function generateApiToken(): string {
  return `csr_live_${randomBytes(24).toString("hex")}`;
}

/**
 * POST /api/agent/register
 *
 * Registers or re-registers a device. Returns a unique deviceId and apiToken.
 * The agent should store these securely in its local config (e.g., encrypted file).
 */
router.post("/agent/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.message });
    return;
  }

  const { hostname, operatingSystem, agentVersion, userId } = parsed.data;

  const [user] = await db
    .select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(400).json({ error: `User ${userId} not found` });
    return;
  }

  const apiToken = generateApiToken();

  // Upsert: update existing device for this user+hostname, or create new
  const [existing] = await db
    .select({ id: devicesTable.id, createdAt: devicesTable.createdAt })
    .from(devicesTable)
    .where(and(eq(devicesTable.name, hostname), eq(devicesTable.userId, userId)))
    .limit(1);

  let deviceId: number;
  let deviceCreatedAt: Date;
  let isNew = false;

  if (existing) {
    await db
      .update(devicesTable)
      .set({ agentVersion, apiToken, updatedAt: new Date() })
      .where(eq(devicesTable.id, existing.id));
    deviceId = existing.id;
    deviceCreatedAt = existing.createdAt;
  } else {
    const [created] = await db
      .insert(devicesTable)
      .values({ userId, name: hostname, operatingSystem, agentVersion, apiToken, isOnline: false })
      .returning({ id: devicesTable.id, createdAt: devicesTable.createdAt });
    deviceId = created.id;
    deviceCreatedAt = created.createdAt;
    isNew = true;
  }

  res.status(isNew ? 201 : 200).json({
    deviceId,
    apiToken,
    assignedUser: user.name,
    registeredAt: deviceCreatedAt,
    isNew,
    nextStep: "Use deviceId + apiToken to call POST /api/agent/login",
  });
});

/**
 * POST /api/agent/login
 *
 * Exchanges deviceId + apiToken for a signed JWT (valid 1 hour).
 * The agent must re-authenticate when the JWT expires.
 */
router.post("/agent/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.message });
    return;
  }

  const { deviceId, apiToken } = parsed.data;

  const [device] = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.id, deviceId))
    .limit(1);

  if (!device || device.apiToken !== apiToken) {
    res.status(401).json({ error: "Invalid deviceId or apiToken" });
    return;
  }

  // Mark device online and update last-seen
  await db
    .update(devicesTable)
    .set({ isOnline: true, lastSeenAt: new Date() })
    .where(eq(devicesTable.id, deviceId));

  const token = await signAgentToken(device.id, device.userId);

  res.json({
    token,
    tokenType: "Bearer",
    expiresIn: 3600,
    deviceId: device.id,
    userId: device.userId,
    hostname: device.name,
    operatingSystem: device.operatingSystem,
  });
});

export default router;
