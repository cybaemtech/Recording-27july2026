import { Router, type IRouter } from "express";

// System
import healthRouter from "./health.js";
import docsRouter from "./docs.js";

// User auth
import authRouter from "./auth.js";

// Agent APIs (no user auth required — use agent tokens)
import agentRouter from "./agent.js";
import sessionAgentRouter from "./session-agent.js";
import recordingRouter from "./recording.js";
import deviceStatusRouter from "./device-status.js";

// Dashboard APIs (user auth enforced inside each route or via middleware)
import dashboardRouter from "./dashboard.js";
import sessionsRouter from "./sessions.js";
import usersRouter from "./users.js";
import devicesRouter from "./devices.js";
import settingsRouter from "./settings.js";
import auditLogsRouter from "./audit-logs.js";
import dbConnectionsRouter from "./db-connections.js";
import downloadRouter from "./download.js";

const router: IRouter = Router();

// ---- System ----
router.use(healthRouter);
router.use(docsRouter);

// ---- Auth ----
router.use(authRouter);

// ---- Agent integration (open: POST /agent/register + /agent/login; rest: AgentAuth) ----
router.use(agentRouter);
router.use(sessionAgentRouter);
router.use(recordingRouter);
router.use(deviceStatusRouter);

// ---- Dashboard data ----
router.use(dashboardRouter);
router.use(sessionsRouter);
router.use(usersRouter);
router.use(devicesRouter);
router.use(settingsRouter);
router.use(auditLogsRouter);
router.use(dbConnectionsRouter);
router.use(downloadRouter);

export default router;

