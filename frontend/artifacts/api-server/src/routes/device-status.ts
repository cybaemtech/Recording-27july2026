/**
 * Device status / heartbeat endpoint.
 * Called by the agent at startup and on connection state changes.
 * Requires Agent JWT.
 */
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, devicesTable } from "@workspace/db";
import { z } from "zod";
import { requireAgentAuth } from "../middlewares/auth.js";
import type { AgentJWTPayload } from "../lib/jwt.js";

const router: IRouter = Router();

const StatusBody = z.object({
  deviceId: z.coerce.number().int().positive(),
  isOnline: z.boolean(),
  agentVersion: z.string().max(50).optional(),
  /** Arbitrary key-value metadata for future extensibility */
  metadata: z.record(z.string(), z.string()).optional(),
});

/**
 * POST /api/device/status
 *
 * Updates the device's online status and agent version. Designed to be called:
 * - On agent startup (isOnline: true)
 * - On graceful shutdown (isOnline: false)
 * - Periodically as a keep-alive (isOnline: true)
 */
router.post("/device/status", requireAgentAuth, async (req, res): Promise<void> => {
  const parsed = StatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.message });
    return;
  }

  const { deviceId, isOnline, agentVersion } = parsed.data;
  const agent = req.auth as AgentJWTPayload;

  if (agent.deviceId !== deviceId) {
    res.status(403).json({ error: "JWT device does not match requested deviceId" });
    return;
  }

  const [device] = await db
    .update(devicesTable)
    .set({
      isOnline,
      lastSeenAt: new Date(),
      ...(agentVersion ? { agentVersion } : {}),
      updatedAt: new Date(),
    })
    .where(eq(devicesTable.id, deviceId))
    .returning();

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json({
    ok: true,
    deviceId,
    isOnline,
    agentVersion: device.agentVersion,
    lastSeenAt: device.lastSeenAt,
  });
});

export default router;
