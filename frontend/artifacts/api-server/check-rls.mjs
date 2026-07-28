import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function run() {
  const res = await db.execute(sql`
    SELECT tablename, policyname, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'sessions';
  `);
  console.log(res);
}

run();
