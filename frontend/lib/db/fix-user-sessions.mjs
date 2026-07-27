import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../artifacts/api-server/.env") });

async function autoCreateAndLinkUsers() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set!");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("Checking devices needing user assignment...");
    const devicesRes = await pool.query(`SELECT id, name, user_id FROM devices;`);

    for (const dev of devicesRes.rows) {
      // If device has a custom name like PremAher, Vam, Bhavna, Garima, etc.
      if (dev.name !== 'Local Device' && dev.name !== 'web-app-instanc' && dev.name !== 'DESKTOP-62JCDIS' && dev.name !== 'test-device-123') {
        const cleanName = dev.name.replace(/[-_]/g, ' ').trim();
        const email = `${dev.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@cybaemtech.com`;

        // Check if user exists
        let uRes = await pool.query(`SELECT id FROM users WHERE email = $1 OR LOWER(name) = $2;`, [email, cleanName.toLowerCase()]);
        let targetUserId;

        if (uRes.rows.length > 0) {
          targetUserId = uRes.rows[0].id;
        } else {
          // Create user
          const newUser = await pool.query(`
            INSERT INTO users (name, email, password_hash, role, is_online)
            VALUES ($1, $2, 'agent-created', 'user', true)
            RETURNING id;
          `, [cleanName, email]);
          targetUserId = newUser.rows[0].id;
          console.log(`+ Created User '${cleanName}' (${email}) -> User ID ${targetUserId}`);
        }

        // Link device to user
        await pool.query(`UPDATE devices SET user_id = $1 WHERE id = $2;`, [targetUserId, dev.id]);
        
        // Link sessions for this device to user
        const sessUp = await pool.query(`UPDATE sessions SET user_id = $1 WHERE device_id = $2;`, [targetUserId, dev.id]);
        console.log(`Linked device '${dev.name}' (ID ${dev.id}) and ${sessUp.rowCount} sessions to User ID ${targetUserId}`);
      }
    }

    console.log("All devices and sessions successfully linked to their respective user profiles!");
  } catch (err) {
    console.error("Error in autoCreateAndLinkUsers:", err);
  } finally {
    await pool.end();
  }
}

autoCreateAndLinkUsers();
