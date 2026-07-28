const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(`
    SELECT count(*) FROM audit_logs WHERE action = 'Website / Tab Usage';
  `);
  console.log("Total audit logs for Website / Tab Usage:", res.rows[0].count);
  await client.end();
}

run();
