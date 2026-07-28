const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  await client.query(`
    CREATE POLICY "anon_insert_audit_logs" ON audit_logs FOR INSERT TO anon WITH CHECK (true);
  `).catch(e => console.log(e.message));
  
  console.log("Created anon_insert_audit_logs policy.");
  await client.end();
}

run();
