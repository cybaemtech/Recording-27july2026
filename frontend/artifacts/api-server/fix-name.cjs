require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  try {
    const res = await pool.query("UPDATE users SET name = 'Nikita Nagargoje' WHERE name ILIKE '%CT-LT-%' OR email ILIKE '%ct-lt-%'");
    console.log('Updated ' + res.rowCount + ' users.');
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
