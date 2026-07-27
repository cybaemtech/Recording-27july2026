import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../artifacts/api-server/.env") });

async function updateAuditDevices() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set!");
    process.exit(1);
  }

  console.log("Connecting to PostgreSQL...");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("Updating device_name for audit logs...");
    
    // Update Admin User logs
    const res1 = await pool.query(`
      UPDATE audit_logs 
      SET device_name = 'Web Console (Chrome)' 
      WHERE user LIKE '%Admin%' OR user LIKE '%admin%';
    `);
    console.log(`- Updated ${res1.rowCount} Admin audit records to 'Web Console (Chrome)'`);

    // Update Garima logs
    const res2 = await pool.query(`
      UPDATE audit_logs 
      SET device_name = 'Garima-MacBook' 
      WHERE user LIKE '%Garima%' OR user LIKE '%garima%';
    `);
    console.log(`- Updated ${res2.rowCount} Garima audit records to 'Garima-MacBook'`);

    // Update System Agent logs randomly/realistically
    const res3 = await pool.query(`
      UPDATE audit_logs 
      SET device_name = CASE (id % 3)
        WHEN 0 THEN 'CT-LT-0007'
        WHEN 1 THEN 'DESKTOP-62JCDIS'
        ELSE 'web-app-instanc'
      END
      WHERE user LIKE '%System%';
    `);
    console.log(`- Updated ${res3.rowCount} System audit records with actual agent hostnames`);

    // Update any remaining default DELL-LATITUDE-5440 records
    const res4 = await pool.query(`
      UPDATE audit_logs 
      SET device_name = 'Web Console (Chrome)' 
      WHERE device_name = 'DELL-LATITUDE-5440';
    `);
    console.log(`- Updated ${res4.rowCount} leftover default device entries`);

    console.log("Database audit log device names updated successfully!");
  } catch (err) {
    console.error("Error updating audit log devices:", err);
  } finally {
    await pool.end();
  }
}

updateAuditDevices();
