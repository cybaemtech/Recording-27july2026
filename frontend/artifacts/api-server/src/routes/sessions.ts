import { Router, type IRouter } from "express";
import { eq, desc, sql, and, or, ilike } from "drizzle-orm";
import { db, sessionsTable, usersTable, devicesTable, auditLogsTable } from "@workspace/db";
import {
  ListSessionsQueryParams,
  GetSessionParams,
  DeleteSessionParams,
} from "@workspace/api-zod";
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

router.post("/upload", async (req, res): Promise<void> => {
  const fileName = req.headers["x-file-name"] as string;
  const recordedAt = req.headers["x-recorded-at"] as string;
  const duration = Number(req.headers["x-duration"] || 0);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: "Supabase credentials are not configured in api-server/.env" });
    return;
  }

  try {
    // Read binary body chunks from req stream
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);

    console.log(`Uploading ${fileName} (${fileBuffer.length} bytes) to Supabase Storage...`);

    // Upload to Supabase Storage REST API
    const uploadUrl = `${supabaseUrl}/storage/v1/object/recordings/${fileName}`;
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
        "Content-Type": "video/webm",
      },
      body: fileBuffer
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Supabase Storage upload failed: ${errText}`);
    }

    // Get Public URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/recordings/${fileName}`;
    console.log(`Video uploaded successfully. Public URL: ${publicUrl}`);

    if (process.env.DATABASE_URL) {
      let [user] = await db.select().from(usersTable).where(eq(usersTable.email, "admin")).limit(1);
      if (!user) {
        [user] = await db.insert(usersTable).values({
          name: "Admin User",
          email: "admin",
          passwordHash: "admin123",
          role: "admin",
        }).returning();
      }

      let [device] = await db.select().from(devicesTable).where(eq(devicesTable.name, "Local Device")).limit(1);
      if (!device) {
        [device] = await db.insert(devicesTable).values({
          name: "Local Device",
          operatingSystem: "Windows",
          userId: user.id,
        }).returning();
      }

      const [session] = await db.insert(sessionsTable).values({
        userId: user.id,
        deviceId: device.id,
        loginTime: new Date(recordedAt),
        logoutTime: new Date(new Date(recordedAt).getTime() + duration * 1000),
        durationSeconds: duration,
        recordingSizeBytes: fileBuffer.length,
        recordingUrl: publicUrl,
        uploadStatus: "completed",
        recordingStatus: "completed",
      }).returning();

      res.status(201).json({ ok: true, sessionId: session.id, url: publicUrl });
    } else {
      res.json({ ok: true, source: "mock-offline", url: publicUrl });
    }
  } catch (err: any) {
    console.error("Upload handler error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/sessions", async (req, res): Promise<void> => {
  if (!process.env.DATABASE_URL) {
    const localRecs = getLocalRecordings();
    
    // Sort
    const sorted = [...localRecs].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    
    // Search filter
    const searchVal = req.query.search as string;
    const filtered = searchVal 
      ? sorted.filter(r => 
          r.employeeName.toLowerCase().includes(searchVal.toLowerCase()) || 
          r.employeeId.toLowerCase().includes(searchVal.toLowerCase())
        )
      : sorted;

    const pageNum = Number(req.query.page || 1);
    const limitNum = Number(req.query.limit || 20);
    const offset = (pageNum - 1) * limitNum;
    
    const paginated = filtered.slice(offset, offset + limitNum);
    
    res.json({
      data: paginated.map(r => ({
        id: r.id,
        userId: 1,
        deviceId: 1,
        loginTime: r.recordedAt,
        logoutTime: r.recordedAt,
        durationSeconds: r.duration,
        recordingSizeBytes: r.duration * 15000, // mock size based on duration
        recordingUrl: `/api/recordings/${r.fileName}`,
        uploadStatus: "completed",
        recordingStatus: "completed",
        createdAt: r.recordedAt,
        updatedAt: r.recordedAt,
        user: {
          id: 1,
          name: r.employeeName,
          email: `${r.employeeId.toLowerCase()}@company.com`,
          avatarUrl: null
        },
        device: {
          id: 1,
          name: "Local Device",
          operatingSystem: "Windows"
        }
      })),
      total: filtered.length,
      page: pageNum,
      limit: limitNum
    });
    return;
  }

  const parsed = ListSessionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 20, userId, status, search } = parsed.data as any;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (userId != null) conditions.push(eq(sessionsTable.userId, userId));
  if (status != null) conditions.push(sql`${sessionsTable.uploadStatus} = ${status}`);
  if (search) {
    conditions.push(
      or(
        ilike(usersTable.name, `%${search}%`),
        ilike(devicesTable.name, `%${search}%`)
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [sessions, totalResult] = await Promise.all([
    db
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
        createdAt: sessionsTable.createdAt,
        updatedAt: sessionsTable.updatedAt,
        userName: usersTable.name,
        userEmail: usersTable.email,
        userAvatarUrl: usersTable.avatarUrl,
        deviceName: devicesTable.name,
        deviceOs: devicesTable.operatingSystem,
      })
      .from(sessionsTable)
      .leftJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
      .leftJoin(devicesTable, eq(sessionsTable.deviceId, devicesTable.id))
      .where(whereClause)
      .orderBy(desc(sessionsTable.loginTime))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessionsTable)
      .leftJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
      .leftJoin(devicesTable, eq(sessionsTable.deviceId, devicesTable.id))
      .where(whereClause),
  ]);

  res.json({
    data: sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      deviceId: s.deviceId,
      loginTime: s.loginTime,
      logoutTime: s.logoutTime,
      durationSeconds: s.durationSeconds,
      recordingSizeBytes: s.recordingSizeBytes,
      recordingUrl: s.recordingUrl,
      uploadStatus: s.uploadStatus,
      recordingStatus: s.recordingStatus,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      user: {
        id: s.userId,
        name: s.userName ?? "Unknown",
        email: s.userEmail ?? "",
        avatarUrl: s.userAvatarUrl ?? null,
      },
      device: {
        id: s.deviceId,
        name: s.deviceName ?? "Unknown",
        operatingSystem: s.deviceOs ?? "Windows",
      },
    })),
    total: totalResult[0]?.count ?? 0,
    page,
    limit,
  });
});

router.get("/sessions/:id", async (req, res): Promise<void> => {
  if (!process.env.DATABASE_URL) {
    const localRecs = getLocalRecordings();
    const r = localRecs.find(x => x.id === Number(req.params.id));
    if (!r) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json({
      id: r.id,
      userId: 1,
      deviceId: 1,
      loginTime: r.recordedAt,
      logoutTime: r.recordedAt,
      durationSeconds: r.duration,
      recordingSizeBytes: r.duration * 15000,
      recordingUrl: `/api/recordings/${r.fileName}`,
      uploadStatus: "completed",
      recordingStatus: "completed",
      createdAt: r.recordedAt,
      updatedAt: r.recordedAt,
      user: {
        id: 1,
        name: r.employeeName,
        email: `${r.employeeId.toLowerCase()}@company.com`,
        department: "IT Security",
        role: "admin",
        avatarUrl: null
      },
      device: {
        id: 1,
        name: "Local Device",
        operatingSystem: "Windows",
        agentVersion: "2.4.1"
      }
    });
    return;
  }

  const params = GetSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
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
      createdAt: sessionsTable.createdAt,
      updatedAt: sessionsTable.updatedAt,
      userName: usersTable.name,
      userEmail: usersTable.email,
      userDepartment: usersTable.department,
      userRole: usersTable.role,
      userAvatarUrl: usersTable.avatarUrl,
      deviceName: devicesTable.name,
      deviceOs: devicesTable.operatingSystem,
      deviceAgentVersion: devicesTable.agentVersion,
    })
    .from(sessionsTable)
    .leftJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .leftJoin(devicesTable, eq(sessionsTable.deviceId, devicesTable.id))
    .where(eq(sessionsTable.id, params.data.id))
    .limit(1);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json({
    id: session.id,
    userId: session.userId,
    deviceId: session.deviceId,
    loginTime: session.loginTime,
    logoutTime: session.logoutTime,
    durationSeconds: session.durationSeconds,
    recordingSizeBytes: session.recordingSizeBytes,
    recordingUrl: session.recordingUrl,
    uploadStatus: session.uploadStatus,
    recordingStatus: session.recordingStatus,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    user: {
      id: session.userId,
      name: session.userName ?? "Unknown",
      email: session.userEmail ?? "",
      department: session.userDepartment ?? null,
      role: session.userRole ?? "user",
      avatarUrl: session.userAvatarUrl ?? null,
    },
    device: {
      id: session.deviceId,
      name: session.deviceName ?? "Unknown",
      operatingSystem: session.deviceOs ?? "Windows",
      agentVersion: session.deviceAgentVersion ?? null,
    },
  });
});

router.get("/sessions/:id/apps", async (req, res): Promise<void> => {
  const params = GetSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const [session] = await db
      .select({
        userId: sessionsTable.userId,
        loginTime: sessionsTable.loginTime,
        logoutTime: sessionsTable.logoutTime,
      })
      .from(sessionsTable)
      .where(eq(sessionsTable.id, params.data.id))
      .limit(1);

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // Default to "now" if session is still active
    const endTime = session.logoutTime || new Date();

    const logs = await db
      .select({ details: auditLogsTable.details })
      .from(auditLogsTable)
      .where(
        and(
          eq(auditLogsTable.userId, session.userId),
          eq(auditLogsTable.action, "Website / Tab Usage"),
          sql`${auditLogsTable.timestamp} >= ${session.loginTime}`,
          sql`${auditLogsTable.timestamp} <= ${endTime}`
        )
      );

    const appMap: Record<string, { duration: number, category: string }> = {};

    logs.forEach(log => {
      if (!log.details) return;
      const details = log.details;
      // Parse details: Website/Tab: "App Name" (Window Title) | Time In: ... | Time Used: 1m 5s
      const nameMatch = details.match(/Website\/Tab:\s*(?:"([^"]+)"|([^\s|]+))/);
      const timeMatch = details.match(/(?:Time Used|Duration):\s*([^|]+)/i);
      
      let appName = "Unknown App";
      if (nameMatch) {
        appName = (nameMatch[1] || nameMatch[2] || "").trim();
      }
      
      let durationSeconds = 0;
      if (timeMatch) {
        const timeStr = timeMatch[1].trim();
        const hMatch = timeStr.match(/(\d+)h/);
        const mMatch = timeStr.match(/(\d+)m/);
        const sMatch = timeStr.match(/(\d+)s/);
        
        if (hMatch) durationSeconds += parseInt(hMatch[1]) * 3600;
        if (mMatch) durationSeconds += parseInt(mMatch[1]) * 60;
        if (sMatch) durationSeconds += parseInt(sMatch[1]);
        if (!hMatch && !mMatch && !sMatch) {
          // just seconds if it's a plain number
          durationSeconds += parseInt(timeStr) || 0;
        }
      }

      if (!appMap[appName]) {
        // Categorization heuristic
        const lowerName = appName.toLowerCase();
        let category = "neutral";
        
        const productiveKeywords = ["code", "github", "docs", "teams", "word", "excel", "supabase", "terminal", "powershell", "dev"];
        const unproductiveKeywords = ["youtube", "facebook", "twitter", "instagram", "reddit", "netflix", "whatsapp", "telegram", "game"];
        
        if (productiveKeywords.some(kw => lowerName.includes(kw))) {
          category = "productive";
        } else if (unproductiveKeywords.some(kw => lowerName.includes(kw))) {
          category = "unproductive";
        }

        appMap[appName] = { duration: 0, category };
      }

      appMap[appName].duration += durationSeconds;
    });

    const result = Object.entries(appMap).map(([name, data]) => ({
      name,
      duration: data.duration,
      category: data.category
    })).sort((a, b) => b.duration - a.duration);

    res.json(result);
  } catch (err: any) {
    console.error("Error fetching session apps:", err);
    res.status(500).json({ error: "Failed to fetch session apps" });
  }
});
router.delete("/sessions/:id", async (req, res): Promise<void> => {
  if (!process.env.DATABASE_URL) {
    const localRecs = getLocalRecordings();
    const index = localRecs.findIndex(x => x.id === Number(req.params.id));
    if (index === -1) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    
    // Actually delete the record from recordings.json
    localRecs.splice(index, 1);
    const jsonPath = path.join(process.cwd(), "../../data/recordings.json");
    try {
      fs.writeFileSync(jsonPath, JSON.stringify(localRecs, null, 2));
    } catch (err) {
      console.error(err);
    }
    
    res.sendStatus(204);
    return;
  }

  const params = DeleteSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(sessionsTable)
    .where(eq(sessionsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
