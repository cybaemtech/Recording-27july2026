import { Router, type IRouter } from "express";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { sql, and, gte } from "drizzle-orm";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

const getLocalRecordings = (): any[] => {
  const jsonPath = path.join(process.cwd(), "../../data/recordings.json");
  try {
    if (fs.existsSync(jsonPath)) {
      const content = fs.readFileSync(jsonPath, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading local recordings", err);
  }
  return [];
};

router.get("/dashboard", async (req, res): Promise<void> => {
  if (!process.env.DATABASE_URL) {
    const localRecs = getLocalRecordings();
    const todayStr = new Date().toISOString().split("T")[0];
    const todaysSessions = localRecs.filter(r => r.recordedAt.startsWith(todayStr)).length;
    const totalBytes = localRecs.reduce((acc, curr) => acc + (curr.duration * 15000), 0);
    
    res.json({
      totalUsers: 1,
      onlineUsers: 1,
      activeRecordingSessions: 0,
      todaysSessions: todaysSessions,
      cloudStorageUsedBytes: totalBytes,
      failedUploads: 0,
    });
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsersResult,
    onlineUsersResult,
    activeSessionsResult,
    todaysSessionsResult,
    storageResult,
    failedUploadsResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(usersTable),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(sql`is_online = true`),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessionsTable)
      .where(sql`recording_status = 'active'`),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessionsTable)
      .where(gte(sessionsTable.loginTime, today)),
    db
      .select({ total: sql<number>`coalesce(sum(recording_size_bytes), 0)::bigint` })
      .from(sessionsTable),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessionsTable)
      .where(sql`upload_status = 'failed'`),
  ]);

  res.json({
    totalUsers: totalUsersResult[0]?.count ?? 0,
    onlineUsers: onlineUsersResult[0]?.count ?? 0,
    activeRecordingSessions: activeSessionsResult[0]?.count ?? 0,
    todaysSessions: todaysSessionsResult[0]?.count ?? 0,
    cloudStorageUsedBytes: Number(storageResult[0]?.total ?? 0),
    failedUploads: failedUploadsResult[0]?.count ?? 0,
  });
});

router.get("/reports/activity", async (req, res): Promise<void> => {
  if (!process.env.DATABASE_URL) {
    const localRecs = getLocalRecordings();
    
    // Generate last 30 days list
    const data = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = localRecs.filter(r => r.recordedAt.startsWith(dateStr)).length;
      data.push({
        date: dateStr,
        sessionCount: count,
        recordingCount: count
      });
    }
    res.json(data);
    return;
  }

  const rows = await db.execute(sql`
    SELECT
      to_char(date_series, 'YYYY-MM-DD') AS date,
      count(s.id)::int AS session_count,
      count(s.id) FILTER (WHERE s.recording_status = 'completed')::int AS recording_count
    FROM generate_series(
      now() - interval '29 days',
      now(),
      interval '1 day'
    ) AS date_series
    LEFT JOIN sessions s
      ON date_trunc('day', s.login_time) = date_trunc('day', date_series)
    GROUP BY date_series
    ORDER BY date_series ASC
  `);

  res.json(
    rows.rows.map((r: any) => ({
      date: r.date,
      sessionCount: r.session_count,
      recordingCount: r.recording_count,
    }))
  );
});

router.get("/reports/storage", async (req, res): Promise<void> => {
  if (!process.env.DATABASE_URL) {
    const localRecs = getLocalRecordings();
    const totalBytes = localRecs.reduce((acc, curr) => acc + (curr.duration * 15000), 0);
    res.json([
      {
        os: "Windows",
        storageBytes: totalBytes,
        sessionCount: localRecs.length
      }
    ]);
    return;
  }

  const rows = await db.execute(sql`
    SELECT
      d.operating_system AS os,
      coalesce(sum(s.recording_size_bytes), 0)::bigint AS storage_bytes,
      count(s.id)::int AS session_count
    FROM devices d
    LEFT JOIN sessions s ON s.device_id = d.id
    GROUP BY d.operating_system
    ORDER BY storage_bytes DESC
  `);

  res.json(
    rows.rows.map((r: any) => ({
      os: r.os,
      storageBytes: Number(r.storage_bytes),
      sessionCount: r.session_count,
    }))
  );
});

export default router;
