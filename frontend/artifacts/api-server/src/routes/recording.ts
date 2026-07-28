/**
 * Recording upload notification endpoint.
 * Called by the agent after uploading a recording to cloud storage.
 * Requires Agent JWT.
 */
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sessionsTable } from "@workspace/db";
import { z } from "zod";
import { requireAgentAuth } from "../middlewares/auth.js";
import type { AgentJWTPayload } from "../lib/jwt.js";

const router: IRouter = Router();

const UploadBody = z.object({
  sessionId: z.coerce.number().int().positive(),
  recordingUrl: z.string().url(),
  fileSizeBytes: z.coerce.number().int().positive().max(2_000_000_000),
  uploadStatus: z.enum(["completed", "failed"]).default("completed"),
  /** Optional SHA-256 or MD5 for integrity verification */
  checksum: z.string().optional(),
  /** MIME type of the recording, e.g. video/mp4 */
  mimeType: z.string().optional(),
});

/**
 * POST /api/recording/upload
 *
 * The agent uploads the recording to its own cloud storage (S3, Azure Blob, GCS)
 * and then notifies this API with the resulting URL. The URL is stored against
 * the session and becomes accessible via GET /api/sessions/:id.
 */
router.post("/recording/upload", requireAgentAuth, async (req, res): Promise<void> => {
  const parsed = UploadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.message });
    return;
  }

  const { sessionId, recordingUrl, fileSizeBytes, uploadStatus, checksum } = parsed.data;
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

  await db
    .update(sessionsTable)
    .set({
      recordingUrl,
      recordingSizeBytes: fileSizeBytes,
      uploadStatus,
      updatedAt: new Date(),
    })
    .where(eq(sessionsTable.id, sessionId));

  res.json({
    ok: true,
    sessionId,
    recordingUrl,
    fileSizeBytes,
    uploadStatus,
    storedAt: new Date().toISOString(),
    ...(checksum ? { checksum } : {}),
    viewUrl: `/api/sessions/${sessionId}`,
  });
});

export default router;
