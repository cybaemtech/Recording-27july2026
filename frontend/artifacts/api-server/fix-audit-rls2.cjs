const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  await client.query(`
    CREATE POLICY "anon_select_audit_logs" ON audit_logs FOR SELECT TO anon USING (true);
  `).catch(e => console.log(e.message));
  
  console.log("Created anon_select_audit_logs policy.");
  await client.end();
}

run();
