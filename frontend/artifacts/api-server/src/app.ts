import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

import path from "path";
import fs from "fs";

const app: Express = express();

const isProduction = process.env.NODE_ENV === "production";

app.use(
  pinoHttp({
    logger,
    ...(isProduction ? { autoLogging: false } : {}),
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : ["*"];
app.use(cors({ origin: corsOrigins, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/recordings", express.static(path.join(process.cwd(), "../../data/recordings")));
app.use("/api", router);

// --- Production: Serve React dashboard static files ---
const dashboardDistDir = path.resolve(
  import.meta.dirname ?? __dirname,
  "..",
  "..",
  "dashboard",
  "dist",
  "public"
);

if (fs.existsSync(dashboardDistDir)) {
  logger.info({ dir: dashboardDistDir }, "Serving dashboard static files");

  // Serve static assets (JS, CSS, images, fonts)
  app.use(
    express.static(dashboardDistDir, {
      maxAge: isProduction ? "1y" : 0,
      immutable: isProduction,
      index: false, // Don't auto-serve index.html for "/" yet
    })
  );

  // SPA fallback: any non-API route returns index.html
  const indexHtml = path.join(dashboardDistDir, "index.html");
  app.use((_req, res) => {
    res.sendFile(indexHtml);
  });
} else {
  logger.warn(
    { dir: dashboardDistDir },
    "Dashboard build not found — run 'pnpm --filter @workspace/dashboard run build' first"
  );
}

export default app;

