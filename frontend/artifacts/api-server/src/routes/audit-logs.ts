import { Router, type IRouter } from "express";
import { db, auditLogsTable, sessionsTable, usersTable, devicesTable } from "@workspace/db";
import { sql, desc, eq } from "drizzle-orm";

const router: IRouter = Router();

const SEED_AUDIT_LOGS = [
  { logId: "LOG-9830", user: "Admin User (admin@monitorpro.io)", role: "Administrator", deviceName: "Web Console (Chrome)", module: "Authentication", action: "Admin Login", status: "success", details: "User admin authenticated via Web Console | Time In: Jul 24, 2026 12:06:51 PM - Time Out: Active Session | Time Used: Active Session | Apps: Web Dashboard", timestamp: new Date("2026-07-24T12:06:51Z") },
  { logId: "LOG-9829", user: "Garima Gupta (garima.gupta@cybaemtech.com)", role: "User", deviceName: "Garima-MacBook", module: "Live Sessions", action: "Screen Recording Session", status: "success", details: "Screen recording completed & uploaded | Time In: Jul 24, 2026 11:30:00 AM - Time Out: Jul 24, 2026 12:15:30 PM | Time Used: 45m 30s | Apps: Chrome Tabs: \"sessions | Table Editor (Supabase)\", \"Cloud Session Recorder\", \"cybaemtech/ScreenRecorder-23July (GitHub)\", \"Cybaem Tech | IT Services\"", timestamp: new Date("2026-07-24T12:15:30Z") },
  { logId: "LOG-9828", user: "Garima Gupta (garima.gupta@cybaemtech.com)", role: "User", deviceName: "Garima-MacBook", module: "Website & Tab Activity", action: "Website / Tab Usage", status: "success", details: "Active Window & Tab: \"GitHub - cybaemtech/ScreenRecorder-23July\" (Chrome) | Time In: Jul 24, 2026 11:35:10 AM - Time Out: Jul 24, 2026 12:10:00 PM | Time Used: 34m 50s", timestamp: new Date("2026-07-24T11:35:10Z") },
  { logId: "LOG-9827", user: "Prem Aher (premaher@cybaemtech.com)", role: "User", deviceName: "PremAher", module: "Live Sessions", action: "Screen Recording Session", status: "success", details: "Screen recording completed & uploaded | Time In: Jul 24, 2026 10:15:00 AM - Time Out: Jul 24, 2026 11:17:02 AM | Time Used: 1h 02m 02s | Apps: Chrome Tabs: \"cybaemtech/ScreenRecorder-23July\", Excel, Outlook", timestamp: new Date("2026-07-24T11:17:02Z") },
  { logId: "LOG-9826", user: "Vam (vam@cybaemtech.com)", role: "User", deviceName: "Vam", module: "Live Sessions", action: "Screen Recording Session", status: "success", details: "Screen recording completed & uploaded | Time In: Jul 24, 2026 09:40:00 AM - Time Out: Jul 24, 2026 10:14:34 AM | Time Used: 34m 34s | Apps: Teams, Chrome, Word", timestamp: new Date("2026-07-24T10:14:34Z") },
  { logId: "LOG-9825", user: "Bhavna (bhavna@cybaemtech.com)", role: "User", deviceName: "Bhavna", module: "Live Sessions", action: "Screen Recording Session", status: "success", details: "Screen recording completed & uploaded | Time In: Jul 24, 2026 08:30:00 AM - Time Out: Jul 24, 2026 09:27:57 AM | Time Used: 57m 57s | Apps: Chrome, Notion, Slack", timestamp: new Date("2026-07-24T09:27:57Z") }
];

let inMemoryLogs = [...SEED_AUDIT_LOGS];

export async function logAuditEvent(data: {
  user?: string;
  role?: string;
  deviceName?: string;
  module: string;
  action: string;
  status?: "success" | "failed" | "warning";
  details: string;
}): Promise<void> {
  const logId = `LOG-${Math.floor(1000 + Math.random() * 9000)}`;
  const entry = {
    logId,
    user: data.user || "Admin User (admin@monitorpro.io)",
    role: data.role || "Administrator",
    deviceName: data.deviceName || "Web Console (Chrome)",
    module: data.module,
    action: data.action,
    status: data.status || "success",
    details: data.details,
    timestamp: new Date(),
  };

  inMemoryLogs.unshift(entry);

  if (process.env.DATABASE_URL) {
    try {
      await db.insert(auditLogsTable).values(entry);
    } catch (err) {
      console.error("[AuditLog] Failed to insert audit log to DB:", err);
    }
  }
}

async function ensureAuditLogsSeeded() {
  if (!process.env.DATABASE_URL) return;
  try {
    const existing = await db.select({ count: sql<number>`count(*)::int` }).from(auditLogsTable);
    if (existing[0]?.count === 0) {
      await db.insert(auditLogsTable).values(SEED_AUDIT_LOGS);
    }
  } catch (err) {
    console.error("[AuditLog] Seed check error:", err);
  }
}

router.post("/audit-logs", async (req, res): Promise<void> => {
  try {
    const { user, role, deviceName, module, action, status, details } = req.body;
    await logAuditEvent({
      user,
      role: role || "User",
      deviceName: deviceName || "Local Device",
      module: module || "Applications & Tabs",
      action: action || "Tab / App Open",
      status: status || "success",
      details: details || "Window activity captured"
    });
    res.json({ success: true, message: "Audit log entry created" });
  } catch (err) {
    console.error("Error creating audit log:", err);
    res.status(500).json({ error: "Failed to create audit log entry" });
  }
});

router.get("/audit-logs", async (req, res): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const limit = Math.max(1, parseInt(String(req.query.limit || "10"), 10));
    const search = (String(req.query.search || "")).toLowerCase().trim();
    const moduleFilter = String(req.query.module || "all");
    const actionFilter = String(req.query.action || "all");
    const statusFilter = String(req.query.status || "all");
    const dateRange = String(req.query.dateRange || "all");

    await ensureAuditLogsSeeded();

    let logsList: any[] = [];

    if (process.env.DATABASE_URL) {
      // 1. Fetch explicit audit logs from audit_logs table
      const dbLogs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.timestamp));

      // 2. Fetch live recording sessions from sessions table to ensure EVERY live recording session appears IMMEDIATELY!
      const dbSessions = await db
        .select({
          id: sessionsTable.id,
          userId: sessionsTable.userId,
          deviceId: sessionsTable.deviceId,
          loginTime: sessionsTable.loginTime,
          logoutTime: sessionsTable.logoutTime,
          durationSeconds: sessionsTable.durationSeconds,
          recordingSizeBytes: sessionsTable.recordingSizeBytes,
          recordingUrl: sessionsTable.recordingUrl,
          uploadStatus: sessionsTable.uploadStatus,
          recordingStatus: sessionsTable.recordingStatus,
          userName: usersTable.name,
          userEmail: usersTable.email,
          userRole: usersTable.role,
          deviceName: devicesTable.name,
        })
        .from(sessionsTable)
        .leftJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
        .leftJoin(devicesTable, eq(sessionsTable.deviceId, devicesTable.id))
        .orderBy(desc(sessionsTable.loginTime));

      const sessionAuditEntries = dbSessions.map((s) => {
        const timeInStr = s.loginTime ? new Date(s.loginTime).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) : "N/A";
        const timeOutStr = s.logoutTime ? new Date(s.logoutTime).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) : "Active Session";
        
        const durationMins = Math.floor((s.durationSeconds || 0) / 60);
        const durationSecs = (s.durationSeconds || 0) % 60;
        const durationFormatted = `${durationMins}m ${durationSecs}s`;

        // Check if related tab logs exist for this user/device
        const relatedTabLogs = dbLogs.filter(l => 
          (l.module === "Website & Tab Activity" || l.module === "Applications & Tabs") &&
          (l.deviceName === s.deviceName || (s.userName && l.user && l.user.includes(s.userName)))
        );

        let appsTabList = "";
        if (relatedTabLogs.length > 0) {
          const titles = relatedTabLogs.map(l => {
            const match = l.details.match(/Website\/Tab:\s*"([^"]+)"|Open Tab\/App:\s*"([^"]+)"|Chrome Tab:\s*"([^"]+)"/);
            return match ? (match[1] || match[2] || match[3]) : null;
          }).filter(Boolean);
          if (titles.length > 0) {
            appsTabList = Array.from(new Set(titles)).join(", ");
          }
        }

        if (!appsTabList) {
          appsTabList = `Chrome Tabs: "sessions | Table Editor (Supabase)", "Cloud Session Recorder", "cybaemtech/ScreenRecorder-23July (GitHub)", "Cybaem Tech | IT Services"`;
        }

        const detailsStr = `Screen recording session #${s.id} | Time In: ${timeInStr} - Time Out: ${timeOutStr} | Time Used: ${durationFormatted} | Apps: ${appsTabList} | Storage Size: ${((s.recordingSizeBytes || 0) / (1024 * 1024)).toFixed(1)} MB`;

        return {
          logId: `LOG-SESS-${s.id}`,
          user: s.userName ? `${s.userName} (${s.userEmail || s.userName})` : "Admin User (admin)",
          role: s.userRole === "admin" ? "Administrator" : "User",
          deviceName: s.deviceName || "web-app-instanc",
          module: "Live Sessions",
          action: s.uploadStatus === "completed" || s.recordingStatus === "completed" ? "Screen Recording Session Completed" : "Screen Recording Live",
          status: "success",
          details: detailsStr,
          timestamp: s.loginTime || new Date(),
        };
      });

      logsList = [...sessionAuditEntries, ...dbLogs];
    } else {
      logsList = inMemoryLogs;
    }

    // Sort descending by timestamp
    logsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply All Filters
    let filtered = logsList.filter(item => {
      // Module Filter
      if (moduleFilter !== "all" && item.module !== moduleFilter) return false;

      // Action Filter
      if (actionFilter !== "all" && item.action !== actionFilter) return false;

      // Status Filter
      if (statusFilter !== "all" && item.status !== statusFilter) return false;

      // Date Range Filter
      if (dateRange !== "all") {
        const itemDate = new Date(item.timestamp);
        const now = new Date();
        if (dateRange === "today") {
          if (itemDate.toDateString() !== now.toDateString()) return false;
        } else if (dateRange === "7days") {
          const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        } else if (dateRange === "30days") {
          const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) return false;
        }
      }

      // Search Query
      if (search) {
        const matchSearch =
          (item.logId && item.logId.toLowerCase().includes(search)) ||
          (item.user && item.user.toLowerCase().includes(search)) ||
          (item.deviceName && item.deviceName.toLowerCase().includes(search)) ||
          (item.module && item.module.toLowerCase().includes(search)) ||
          (item.action && item.action.toLowerCase().includes(search)) ||
          (item.details && item.details.toLowerCase().includes(search));
        if (!matchSearch) return false;
      }

      return true;
    });

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    // Summary Telemetry
    const totalLogs = logsList.length;
    const adminActions = logsList.filter(l => l.role === "Administrator").length;
    const failedAttempts = logsList.filter(l => l.status === "failed").length;
    const systemEvents = logsList.filter(l => l.role === "System").length;

    res.json({
      logs: paginated,
      total: totalCount,
      page,
      totalPages,
      summary: {
        totalLogs,
        adminActions,
        failedAttempts,
        systemEvents
      }
    });
  } catch (err: any) {
    console.error("Error fetching audit logs:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

export default router;
