const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: "postgresql://postgres.gidvoxfkdpxxujipchdz:Cybaem@2026@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres" 
});

async function run() {
  try {
    const res1 = await pool.query("UPDATE devices SET user_id = 10 WHERE user_id = 8");
    console.log("Updated devices:", res1.rowCount);
    
    const res2 = await pool.query("UPDATE sessions SET user_id = 10 WHERE user_id = 8");
    console.log("Updated sessions:", res2.rowCount);
    
    const res3 = await pool.query("DELETE FROM users WHERE id = 8");
    console.log("Deleted user 8:", res3.rowCount);
    
    console.log("Done!");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
