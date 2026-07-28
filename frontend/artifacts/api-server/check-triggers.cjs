const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(`
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'sessions';
  `);
  console.log("Triggers:", res.rows);
  await client.end();
}

run();
