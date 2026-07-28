import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function check() {
  const session = await db.select().from(sessionsTable).where(eq(sessionsTable.id, 31));
  console.log(session);
}

check();
