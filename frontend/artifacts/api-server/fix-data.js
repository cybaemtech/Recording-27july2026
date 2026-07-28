const SUPABASE_URL = "https://gidvoxfkdpxxujipchdz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZHZveGZrZHB4eHVqaXBjaGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwOTIyNzUsImV4cCI6MjA5OTY2ODI3NX0.nbSHVEZbJaPSXHhMWhynZhKpB43VUp0VLYe1FauSQZo";

async function fix() {
  const headers = {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Move devices from user 8 to user 10
    console.log("Moving devices...");
    const res1 = await fetch(`${SUPABASE_URL}/rest/v1/devices?user_id=eq.8`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ user_id: 10 })
    });
    console.log("Devices moved:", res1.status);

    // 2. Move sessions from user 8 to user 10
    console.log("Moving sessions...");
    const res2 = await fetch(`${SUPABASE_URL}/rest/v1/sessions?user_id=eq.8`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ user_id: 10 })
    });
    console.log("Sessions moved:", res2.status);

    // 3. Delete user 8
    console.log("Deleting old duplicate user...");
    const res3 = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.8`, {
      method: 'DELETE',
      headers
    });
    console.log("User 8 deleted:", res3.status);

    console.log("All data successfully migrated to user 10 (Nikita)!");
  } catch (err) {
    console.error(err);
  }
}

fix();
