import app from "./app";
import { logger } from "./lib/logger";
import { startHeartbeatMonitor } from "./lib/monitor";

const port = Number(process.env["PORT"] || 3000);

startHeartbeatMonitor();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
