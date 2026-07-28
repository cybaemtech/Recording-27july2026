async function test() {
  const res = await fetch("http://localhost:3000/api/notify/closed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: 36, type: "normal" })
  });
  const data = await res.json();
  console.log(data);
}
test();
