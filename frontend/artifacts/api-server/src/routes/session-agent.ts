/**
 * Session lifecycle endpoints consumed by the desktop agent.
 * All routes require a valid Agent JWT (from POST /agent/login).
 *
 * Typical call sequence:
 *   POST /session/start       → sessionId
 *   POST /session/heartbeat   (every 30s)
 *   POST /session/end
 *   POST /recording/upload    (optional, handled separately)
 */
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sessionsTable, devicesTable } from "@workspace/db";
import { z } from "zod";
import { requireAgentAuth } from "../middlewares/auth.js";
import type { AgentJWTPayload } from "../lib/jwt.js";

const router: IRouter = Router();

const StartBody = z.object({
  deviceId: z.coerce.number().int().positive(),
});

const HeartbeatBody = z.object({
  sessionId: z.coerce.number().int().positive(),
  durationSeconds: z.coerce.number().int().min(0),
  recordingSizeBytes: z.coerce.number().int().min(0).max(2_000_000_000).optional(),
  recordingStatus: z.enum(["active", "paused", "completed", "failed"]).optional().default("active"),
});

const EndBody = z.object({
  sessionId: z.coerce.number().int().positive(),
  durationSeconds: z.coerce.number().int().min(0),
  recordingSizeBytes: z.coerce.number().int().min(0).max(2_000_000_000).optional(),
  recordingStatus: z.enum(["completed", "failed"]).optional().default("completed"),
});

/**
 * POST /api/session/start
 * Creates a new session and marks the device as online.
 */
router.post("/session/start", requireAgentAuth, async (req, res): Promise<void> => {
  const parsed = StartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.message });
    return;
  }

  const agent = req.auth as AgentJWTPayload;
  const { deviceId } = parsed.data;

  if (agent.deviceId !== deviceId) {
    res.status(403).json({ error: "JWT device does not match requested deviceId" });
    return;
  }

  const [device] = await db
    .select({ id: devicesTable.id, userId: devicesTable.userId })
    .from(devicesTable)
    .where(eq(devicesTable.id, deviceId))
    .limit(1);

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  const loginTime = new Date();
  const [session] = await db
    .insert(sessionsTable)
    .values({
      userId: device.userId,
      deviceId,
      loginTime,
      recordingStatus: "active",
      uploadStatus: "pending",
    })
    .returning();

  await db
    .update(devicesTable)
    .set({ isOnline: true, lastSeenAt: loginTime })
    .where(eq(devicesTable.id, deviceId));

  res.status(201).json({
    sessionId: session.id,
    startedAt: session.loginTime,
    deviceId,
    userId: device.userId,
    nextHeartbeatIn: 30,
  });
});

/**
 * POST /api/session/heartbeat
 * Updates durationSeconds and recordingSizeBytes. Call every ~30 seconds.
 */
router.post("/session/heartbeat", requireAgentAuth, async (req, res): Promise<void> => {
  const parsed = HeartbeatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.message });
    return;
  }

  const { sessionId, durationSeconds, recordingSizeBytes, recordingStatus } = parsed.data;
  const agent = req.auth as AgentJWTPayload;

  const [session] = await db
    .select({ id: sessionsTable.id, deviceId: sessionsTable.deviceId })
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.deviceId !== agent.deviceId) {
    res.status(403).json({ error: "Session does not belong to this device" });
    return;
  }

  const now = new Date();
  await db
    .update(sessionsTable)
    .set({
      durationSeconds,
      uploadStatus: "uploading",
      recordingStatus: recordingStatus ?? "active",
      ...(recordingSizeBytes !== undefined ? { recordingSizeBytes } : {}),
      updatedAt: now,
    })
    .where(eq(sessionsTable.id, sessionId));

  await db
    .update(devicesTable)
    .set({ lastSeenAt: now })
    .where(eq(devicesTable.id, agent.deviceId));

  res.json({
    ok: true,
    sessionId,
    durationSeconds,
    recordingSizeBytes: recordingSizeBytes ?? null,
    nextHeartbeatIn: 30,
  });
});

/**
 * POST /api/session/end
 * Finalizes the session. Sets logoutTime and marks recordingStatus as completed.
 */
router.post("/session/end", requireAgentAuth, async (req, res): Promise<void> => {
  const parsed = EndBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.message });
    return;
  }

  const { sessionId, durationSeconds, recordingSizeBytes, recordingStatus } = parsed.data;
  const agent = req.auth as AgentJWTPayload;

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.deviceId !== agent.deviceId) {
    res.status(403).json({ error: "Session does not belong to this device" });
    return;
  }

  const logoutTime = new Date();
  const [updated] = await db
    .update(sessionsTable)
    .set({
      logoutTime,
      durationSeconds,
      recordingStatus: recordingStatus ?? "completed",
      ...(recordingSizeBytes !== undefined ? { recordingSizeBytes } : {}),
      updatedAt: logoutTime,
    })
    .where(eq(sessionsTable.id, sessionId))
    .returning();

  res.json({
    sessionId,
    status: updated.recordingStatus,
    durationSeconds,
    logoutTime,
    uploadStatus: updated.uploadStatus,
    message:
      updated.uploadStatus !== "completed"
        ? "Call POST /recording/upload to report the cloud storage URL"
        : "Session complete",
  });
});

export default router;
