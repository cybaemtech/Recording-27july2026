import { Router, type IRouter } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { sql, desc, eq, like, or, and, gte } from "drizzle-orm";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

const SEED_AUDIT_LOGS = [
  { logId: "LOG-9830", user: "Admin User (admin@monitorpro.io)", role: "Administrator", deviceName: "DELL-LATITUDE-5440", module: "Authentication", action: "Admin Login", status: "success", details: "Admin user authenticated via OAuth 2.0 with MFA hardware token", timestamp: new Date("2026-07-21T09:40:12Z") },
  { logId: "LOG-9829", user: "Admin User (admin@monitorpro.io)", role: "Administrator", deviceName: "DELL-LATITUDE-5440", module: "Settings", action: "Recording Quality Updated", status: "success", details: "Changed default endpoint recording resolution policy to 1080p (Standard)", timestamp: new Date("2026-07-21T09:15:44Z") },
  { logId: "LOG-9828", user: "IT Support (support@monitorpro.io)", role: "IT Admin", deviceName: "MacBook-Pro-HR", module: "Users", action: "User Created", status: "success", details: "Created endpoint monitoring user profile 'Sarah Jenkins (Finance Analyst)'", timestamp: new Date("2026-07-21T08:52:10Z") },
  { logId: "LOG-9827", user: "System Agent", role: "System", deviceName: "HP-EliteBook-840", module: "Live Sessions", action: "Live Session Started", status: "success", details: "Screen recording & telemetry capture initiated on HP-EliteBook-840 (User: mross)", timestamp: new Date("2026-07-21T08:30:00Z") },
  { logId: "LOG-9826", user: "System Agent", role: "System", deviceName: "Lenovo-ThinkPad-X1", module: "Storage", action: "Upload Completed", status: "success", details: "Uploaded 450 MB encrypted WebM session recording to Supabase Storage bucket", timestamp: new Date("2026-07-21T08:05:18Z") },
  { logId: "LOG-9825", user: "Admin User (admin@monitorpro.io)", role: "Administrator", deviceName: "DELL-LATITUDE-5440", module: "Settings", action: "Stealth Mode Enabled", status: "success", details: "Enabled background stealth mode policy for HR & Executive device groups", timestamp: new Date("2026-07-21T07:42:00Z") },
  { logId: "LOG-9824", user: "Security Auditor (audit@monitorpro.io)", role: "Auditor", deviceName: "Surface-Laptop-5", module: "Reports", action: "Report Exported", status: "success", details: "Exported monthly activity compliance report (PDF / 14.2 MB)", timestamp: new Date("2026-07-21T07:10:33Z") },
  { logId: "LOG-9823", user: "System Agent", role: "System", deviceName: "DELL-LATITUDE-5440", module: "Recordings", action: "Recording Downloaded", status: "success", details: "Session recording #2490 downloaded by Administrator for security inspection", timestamp: new Date("2026-07-21T06:45:12Z") },
  { logId: "LOG-9822", user: "Admin User (admin@monitorpro.io)", role: "Administrator", deviceName: "DELL-LATITUDE-5440", module: "Settings", action: "Data Retention Updated", status: "success", details: "Updated cloud video data retention threshold from 60 days to 90 days", timestamp: new Date("2026-07-21T06:20:00Z") },
  { logId: "LOG-9821", user: "System Agent", role: "System", deviceName: "MacBook-Pro-HR", module: "Devices", action: "Agent Installed", status: "success", details: "MonitorPro Endpoint Desktop Agent v2.4.1 deployed and registered", timestamp: new Date("2026-07-21T05:55:40Z") },
  { logId: "LOG-9820", user: "IT Support (support@monitorpro.io)", role: "IT Admin", deviceName: "HP-EliteBook-840", module: "Users", action: "User Disabled", status: "warning", details: "Disabled endpoint monitoring account for terminated employee (User ID: 104)", timestamp: new Date("2026-07-21T05:30:15Z") },
  { logId: "LOG-9819", user: "System Agent", role: "System", deviceName: "Lenovo-ThinkPad-X1", module: "Live Sessions", action: "Live Session Ended", status: "success", details: "Live stream ended after 4h 12m duration. Session saved as REC-8840", timestamp: new Date("2026-07-21T05:00:00Z") },
  { logId: "LOG-9818", user: "Admin User (admin@monitorpro.io)", role: "Administrator", deviceName: "DELL-LATITUDE-5440", module: "Settings", action: "Audio Recording Enabled", status: "success", details: "Enabled system microphone and speaker output capture across all active agents", timestamp: new Date("2026-07-21T04:25:50Z") },
  { logId: "LOG-9817", user: "System Agent", role: "System", deviceName: "Surface-Laptop-5", module: "Storage", action: "Upload Failed", status: "failed", details: "Upload failed: Remote storage bucket quota exceeded (HTTP 413 Payload Too Large)", timestamp: new Date("2026-07-21T03:50:11Z") },
  { logId: "LOG-9816", user: "Admin User (admin@monitorpro.io)", role: "Administrator", deviceName: "DELL-LATITUDE-5440", module: "Authentication", action: "Admin Logout", status: "success", details: "Admin session ended normally from DELL-LATITUDE-5440", timestamp: new Date("2026-07-21T03:15:00Z") },
  { logId: "LOG-9815", user: "System Agent", role: "System", deviceName: "HP-EliteBook-840", module: "Storage", action: "Upload Started", status: "success", details: "Initiated multi-chunk upload stream for session REC-8839 (size: 320 MB)", timestamp: new Date("2026-07-21T02:40:22Z") },
  { logId: "LOG-9814", user: "IT Support (support@monitorpro.io)", role: "IT Admin", deviceName: "MacBook-Pro-HR", module: "Users", action: "User Updated", status: "success", details: "Updated recording permission policies for Engineering department group", timestamp: new Date("2026-07-21T02:10:05Z") },
  { logId: "LOG-9813", user: "System Agent", role: "System", deviceName: "Lenovo-ThinkPad-X1", module: "Recordings", action: "Recording Started", status: "success", details: "Automated trigger initiated screen recording upon user login", timestamp: new Date("2026-07-21T01:35:48Z") },
  { logId: "LOG-9812", user: "Admin User (admin@monitorpro.io)", role: "Administrator", deviceName: "DELL-LATITUDE-5440", module: "Settings", action: "Purge All Recordings", status: "warning", details: "Initiated manual purge cycle of archived video recordings older than 180 days", timestamp: new Date("2026-07-21T01:00:00Z") },
  { logId: "LOG-9811", user: "System Agent", role: "System", deviceName: "Surface-Laptop-5", module: "Recordings", action: "Recording Deleted", status: "success", details: "Purged expired recording file REC-7712 according to data retention policy", timestamp: new Date("2026-07-20T23:45:10Z") }
];

let inMemoryLogs = [...SEED_AUDIT_LOGS];

/**
 * Public helper to log audit events into PostgreSQL (and fallback memory store).
 * Automatically invoked when admin/system actions occur across all backend routes!
 */
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
    deviceName: data.deviceName || "DELL-LATITUDE-5440",
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

// Seed initial DB records if empty
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

router.get("/audit-logs", async (req, res): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const limit = Math.max(1, parseInt(String(req.query.limit || "10"), 10));
    const search = (String(req.query.search || "")).toLowerCase().trim();
    const moduleFilter = String(req.query.module || "all");
    const actionFilter = String(req.query.action || "all");

    await ensureAuditLogsSeeded();

    let logsList: any[] = [];
    let totalCount = 0;

    if (process.env.DATABASE_URL) {
      const dbLogs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.timestamp));
      logsList = dbLogs;
    } else {
      logsList = inMemoryLogs;
    }

    // Apply Filters
    let filtered = logsList.filter(item => {
      if (moduleFilter !== "all" && item.module !== moduleFilter) return false;
      if (actionFilter !== "all" && item.action !== actionFilter) return false;

      if (search) {
        const matchSearch =
          (item.logId && item.logId.toLowerCase().includes(search)) ||
          (item.user && item.user.toLowerCase().includes(search)) ||
          (item.deviceName && item.deviceName.toLowerCase().includes(search)) ||
          (item.action && item.action.toLowerCase().includes(search)) ||
          (item.details && item.details.toLowerCase().includes(search));
        if (!matchSearch) return false;
      }

      return true;
    });

    totalCount = filtered.length;
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
