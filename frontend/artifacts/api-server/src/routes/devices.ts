import { Router, type IRouter } from "express";
import { eq, sql, and, ilike } from "drizzle-orm";
import { db, devicesTable, usersTable, sessionsTable } from "@workspace/db";
import { ListDevicesQueryParams, GetDeviceParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/devices", async (req, res): Promise<void> => {
  const parsed = ListDevicesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 20, userId, os, search } = parsed.data as any;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (userId != null) conditions.push(eq(devicesTable.userId, userId));
  if (os != null) conditions.push(sql`${devicesTable.operatingSystem} = ${os}`);
  if (search) conditions.push(ilike(devicesTable.name, `%${search}%`));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [devices, totalResult] = await Promise.all([
    db
      .select()
      .from(devicesTable)
      .where(whereClause)
      .orderBy(devicesTable.name)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(devicesTable)
      .where(whereClause),
  ]);

  res.json({
    data: devices.map((d) => ({
      id: d.id,
      userId: d.userId,
      name: d.name,
      operatingSystem: d.operatingSystem,
      isOnline: d.isOnline,
      agentVersion: d.agentVersion ?? null,
      lastSeenAt: d.lastSeenAt ?? null,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
    total: totalResult[0]?.count ?? 0,
    page,
    limit,
  });
});

router.get("/devices/:id", async (req, res): Promise<void> => {
  const params = GetDeviceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [device] = await db
    .select({
      id: devicesTable.id,
      userId: devicesTable.userId,
      name: devicesTable.name,
      operatingSystem: devicesTable.operatingSystem,
      isOnline: devicesTable.isOnline,
      agentVersion: devicesTable.agentVersion,
      lastSeenAt: devicesTable.lastSeenAt,
      createdAt: devicesTable.createdAt,
      updatedAt: devicesTable.updatedAt,
      userName: usersTable.name,
      userEmail: usersTable.email,
      userAvatarUrl: usersTable.avatarUrl,
      userDepartment: usersTable.department,
    })
    .from(devicesTable)
    .leftJoin(usersTable, eq(devicesTable.userId, usersTable.id))
    .where(eq(devicesTable.id, params.data.id))
    .limit(1);

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  const [sessionCountResult, storageResult] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessionsTable)
      .where(eq(sessionsTable.deviceId, device.id)),
    db
      .select({ total: sql<number>`coalesce(sum(recording_size_bytes), 0)::bigint` })
      .from(sessionsTable)
      .where(eq(sessionsTable.deviceId, device.id)),
  ]);

  res.json({
    id: device.id,
    userId: device.userId,
    name: device.name,
    operatingSystem: device.operatingSystem,
    isOnline: device.isOnline,
    agentVersion: device.agentVersion ?? null,
    lastSeenAt: device.lastSeenAt ?? null,
    createdAt: device.createdAt,
    updatedAt: device.updatedAt,
    user: {
      id: device.userId,
      name: device.userName ?? "Unknown",
      email: device.userEmail ?? "",
      avatarUrl: device.userAvatarUrl ?? null,
      department: device.userDepartment ?? null,
    },
    sessionCount: sessionCountResult[0]?.count ?? 0,
    totalStorageBytes: Number(storageResult[0]?.total ?? 0),
  });
});

export default router;
