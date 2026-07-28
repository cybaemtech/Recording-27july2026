import { db } from "@workspace/db";
import { sessionsTable } from "@workspace/db/schema";
import { eq, and, lte } from "drizzle-orm";

export function startHeartbeatMonitor() {
  console.log("Starting heartbeat monitor for stalled sessions...");

  // Check every 30 seconds
  setInterval(async () => {
    try {
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      
      const stalledSessions = await db.select()
        .from(sessionsTable)
        .where(
          and(
            eq(sessionsTable.recordingStatus, "recording"),
            lte(sessionsTable.updatedAt, thirtySecondsAgo)
          )
        );

      if (stalledSessions.length > 0) {
        console.log(`Found ${stalledSessions.length} stalled sessions (likely force-closed).`);
        for (const session of stalledSessions) {
          // Send notification
          try {
            await fetch("http://localhost:3000/api/notify/closed", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: session.id, type: "force" })
            });
            console.log(`Sent force-close notification for session ${session.id}`);
          } catch (e) {
            console.error(`Failed to send force-close notification for session ${session.id}:`, e);
          }

          // Mark session as failed so we don't notify again
          await db.update(sessionsTable)
            .set({ 
              recordingStatus: "failed", 
              uploadStatus: "failed",
              logoutTime: new Date()
            })
            .where(eq(sessionsTable.id, session.id));
        }
      }
    } catch (error) {
      console.error("Error in heartbeat monitor:", error);
    }
  }, 30000);
}
