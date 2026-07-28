import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the api-server .env which has DATABASE_URL
dotenv.config({ path: path.join(__dirname, "../../artifacts/api-server/.env") });

async function applyRls() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set in .env!");
    process.exit(1);
  }

  console.log("Connecting to the database...");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const tables = ["users", "devices", "sessions", "audit_logs", "db_connections", "settings", "db_connection_history", "recordings"];

    console.log("Enabling Row Level Security (RLS) on tables...");
    for (const table of tables) {
      await pool.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`- RLS enabled on ${table}`);
    }

    console.log("Applying policies for anon access to devices and sessions...");
    
    // Drop existing policies if any to avoid errors on re-run
    await pool.query(`DROP POLICY IF EXISTS "anon_select_devices" ON "devices";`);
    await pool.query(`DROP POLICY IF EXISTS "anon_insert_devices" ON "devices";`);
    await pool.query(`DROP POLICY IF EXISTS "anon_insert_sessions" ON "sessions";`);
    await pool.query(`DROP POLICY IF EXISTS "anon_select_sessions" ON "sessions";`);
    await pool.query(`DROP POLICY IF EXISTS "anon_select_users" ON "users";`);
    await pool.query(`DROP POLICY IF EXISTS "anon_insert_users" ON "users";`);

    // Add policies for the "anon" role
    
    // Agent needs to read users to find/verify user_id for FK constraints
    await pool.query(`
      CREATE POLICY "anon_select_users" 
      ON "users" FOR SELECT TO anon 
      USING (true);
    `);
    console.log(`- Created anon SELECT policy on users`);

    // Agent needs to create a default user if none exists
    await pool.query(`
      CREATE POLICY "anon_insert_users" 
      ON "users" FOR INSERT TO anon 
      WITH CHECK (true);
    `);
    console.log(`- Created anon INSERT policy on users`);
    
    // main.js reads from devices: SELECT id FROM devices WHERE name = 'hostname'
    await pool.query(`
      CREATE POLICY "anon_select_devices" 
      ON "devices" FOR SELECT TO anon 
      USING (true);
    `);
    console.log(`- Created anon SELECT policy on devices`);

    // main.js inserts into devices
    await pool.query(`
      CREATE POLICY "anon_insert_devices" 
      ON "devices" FOR INSERT TO anon 
      WITH CHECK (true);
    `);
    console.log(`- Created anon INSERT policy on devices`);

    // main.js inserts into sessions
    await pool.query(`
      CREATE POLICY "anon_insert_sessions" 
      ON "sessions" FOR INSERT TO anon 
      WITH CHECK (true);
    `);
    console.log(`- Created anon INSERT policy on sessions`);

    // Agent/dashboard may need to read sessions back
    await pool.query(`
      CREATE POLICY "anon_select_sessions" 
      ON "sessions" FOR SELECT TO anon 
      USING (true);
    `);
    console.log(`- Created anon SELECT policy on sessions`);

    console.log("Security configuration applied successfully!");
  } catch (err) {
    console.error("Error applying RLS or policies:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyRls();
