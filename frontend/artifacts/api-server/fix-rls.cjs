const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  await client.query(`
    CREATE POLICY "anon_update_sessions" 
    ON sessions 
    FOR UPDATE 
    TO anon 
    USING (true) 
    WITH CHECK (true);
  `);
  
  console.log("Created anon_update_sessions policy.");
  await client.end();
}

run();
