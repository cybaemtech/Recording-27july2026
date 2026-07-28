const SUPABASE_URL = "https://gidvoxfkdpxxujipchdz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZHZveGZrZHB4eHVqaXBjaGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwOTIyNzUsImV4cCI6MjA5OTY2ODI3NX0.nbSHVEZbJaPSXHhMWhynZhKpB43VUp0VLYe1FauSQZo";

async function fix() {
  // 1. Delete user 10 (the pending invite)
  await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.10`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    }
  });

  // 2. Update user 8 to be Nikita
  await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.8`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      name: "Nikita Nagargoje",
      email: "nikita.nagargoje@cybaemtech.com"
    })
  });
  console.log("Database fixed!");
}
fix();
