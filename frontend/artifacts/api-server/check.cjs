const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res1 = await pool.query("SELECT id, name FROM users");
    console.log("Users:", res1.rows);
    
    const res2 = await pool.query("SELECT id, user_id, name FROM devices");
    console.log("Devices:", res2.rows);
    
    const res3 = await pool.query("SELECT id, user_id FROM sessions");
    console.log("Sessions count:", res3.rowCount);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
