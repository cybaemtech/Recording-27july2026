import { db, usersTable, devicesTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function check() {
  try {
    const users = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable);
    console.log("Users:", users);

    const devices = await db.select({ id: devicesTable.id, userId: devicesTable.userId, name: devicesTable.name }).from(devicesTable);
    console.log("Devices:", devices);

    const sessions = await db.select({ id: sessionsTable.id, userId: sessionsTable.userId }).from(sessionsTable);
    console.log("Sessions count:", sessions.length);
    console.log("Sample session:", sessions[0]);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
