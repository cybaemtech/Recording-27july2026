const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  await client.query(`
    CREATE POLICY "anon_update_devices" ON devices FOR UPDATE TO anon USING (true) WITH CHECK (true);
    CREATE POLICY "anon_update_users" ON users FOR UPDATE TO anon USING (true) WITH CHECK (true);
  `).catch(e => console.log(e.message));
  
  console.log("Created missing anon update policies.");
  await client.end();
}

run();
