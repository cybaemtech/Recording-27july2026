/**
 * Swagger UI + OpenAPI spec endpoint.
 * Serves at GET /api/docs  (interactive UI)
 *      and GET /api/docs/spec.json  (raw spec)
 */
import { Router, type IRouter } from "express";

const router: IRouter = Router();

const SPEC = {
  openapi: "3.0.3",
  info: {
    title: "Cloud Session Recorder — Agent & Dashboard API",
    version: "1.0.0",
    description: `RESTful API for the Cloud Session Recorder platform.

**Two authentication mechanisms:**
- 🧑 **User JWT** — issued by \`POST /auth/login\`, used by dashboard clients (24h TTL)
- 🤖 **Agent JWT** — issued by \`POST /agent/login\`, used by desktop recording agents (1h TTL)

---

**Complete agent integration workflow:**
\`\`\`
1. POST /agent/register  →  receive deviceId + apiToken  (store persistently)
2. POST /agent/login     →  exchange for short-lived JWT
3. POST /device/status   →  announce online (isOnline: true)
4. POST /session/start   →  receive sessionId
5. POST /session/heartbeat  ← repeat every 30 s →
6. POST /session/end     →  finalize session
7. POST /recording/upload→  report cloud storage URL
8. POST /device/status   →  announce offline (isOnline: false)
\`\`\`

**Compatible agents:** Electron (Node.js), .NET 6+, Python 3.9+, Go 1.21+`,
    contact: { name: "CSR Platform Team", email: "platform@acmecorp.com" },
    license: { name: "Proprietary" },
  },
  servers: [{ url: "/api", description: "Current API Server" }],
  tags: [
    { name: "Agent Auth", description: "Device registration and token issuance" },
    { name: "Session Workflow", description: "Recording session lifecycle (agent-facing)" },
    { name: "Recording", description: "Recording file management (agent-facing)" },
    { name: "Device", description: "Device telemetry and keep-alive (agent-facing)" },
    { name: "Dashboard", description: "Read-only data APIs for dashboard clients" },
    { name: "User Auth", description: "Human user authentication" },
    { name: "System", description: "Health check and documentation" },
  ],
  components: {
    securitySchemes: {
      UserAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token issued via `POST /auth/login` (dashboard users, 24h)",
      },
      AgentAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token issued via `POST /agent/login` (desktop agents, 1h)",
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string", example: "Invalid request body" },
          details: { type: "string" },
        },
      },
      // ---- Agent Auth ----
      RegisterRequest: {
        type: "object",
        required: ["hostname", "operatingSystem", "agentVersion", "userId"],
        properties: {
          hostname: { type: "string", example: "CORP-WS-042", description: "Unique hostname of the endpoint" },
          operatingSystem: { type: "string", enum: ["Windows", "macOS", "Linux"], example: "Windows" },
          agentVersion: { type: "string", example: "2.4.1" },
          userId: { type: "integer", example: 1, description: "Platform user ID that owns this device" },
          registrationKey: { type: "string", description: "Optional pre-shared key (future use)" },
        },
      },
      RegisterResponse: {
        type: "object",
        properties: {
          deviceId: { type: "integer", example: 42 },
          apiToken: { type: "string", example: "csr_live_a1b2c3d4e5f6...", description: "Store securely; used to obtain JWTs" },
          assignedUser: { type: "string", example: "Jane Smith" },
          registeredAt: { type: "string", format: "date-time" },
          isNew: { type: "boolean" },
          nextStep: { type: "string", example: "Use deviceId + apiToken to call POST /api/agent/login" },
        },
      },
      AgentLoginRequest: {
        type: "object",
        required: ["deviceId", "apiToken"],
        properties: {
          deviceId: { type: "integer", example: 42 },
          apiToken: { type: "string", example: "csr_live_a1b2c3d4e5f6..." },
        },
      },
      AgentLoginResponse: {
        type: "object",
        properties: {
          token: { type: "string", description: "Bearer JWT — include in Authorization header" },
          tokenType: { type: "string", example: "Bearer" },
          expiresIn: { type: "integer", example: 3600, description: "Seconds until expiry" },
          deviceId: { type: "integer", example: 42 },
          userId: { type: "integer", example: 1 },
          hostname: { type: "string", example: "CORP-WS-042" },
          operatingSystem: { type: "string", example: "Windows" },
        },
      },
      // ---- Session Workflow ----
      SessionStartRequest: {
        type: "object",
        required: ["deviceId"],
        properties: { deviceId: { type: "integer", example: 42 } },
      },
      SessionStartResponse: {
        type: "object",
        properties: {
          sessionId: { type: "integer", example: 501 },
          startedAt: { type: "string", format: "date-time" },
          deviceId: { type: "integer", example: 42 },
          userId: { type: "integer", example: 1 },
          nextHeartbeatIn: { type: "integer", example: 30, description: "Seconds until first heartbeat is due" },
        },
      },
      HeartbeatRequest: {
        type: "object",
        required: ["sessionId", "durationSeconds"],
        properties: {
          sessionId: { type: "integer", example: 501 },
          durationSeconds: { type: "integer", example: 30 },
          recordingSizeBytes: { type: "integer", example: 5242880, description: "Current recording file size" },
          recordingStatus: { type: "string", enum: ["active", "paused", "completed", "failed"], default: "active" },
        },
      },
      HeartbeatResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          sessionId: { type: "integer" },
          durationSeconds: { type: "integer" },
          recordingSizeBytes: { type: "integer", nullable: true },
          nextHeartbeatIn: { type: "integer", example: 30 },
        },
      },
      SessionEndRequest: {
        type: "object",
        required: ["sessionId", "durationSeconds"],
        properties: {
          sessionId: { type: "integer", example: 501 },
          durationSeconds: { type: "integer", example: 3600 },
          recordingSizeBytes: { type: "integer", example: 157286400 },
          recordingStatus: { type: "string", enum: ["completed", "failed"], default: "completed" },
        },
      },
      SessionEndResponse: {
        type: "object",
        properties: {
          sessionId: { type: "integer" },
          status: { type: "string", example: "completed" },
          durationSeconds: { type: "integer" },
          logoutTime: { type: "string", format: "date-time" },
          uploadStatus: { type: "string" },
          message: { type: "string" },
        },
      },
      // ---- Recording ----
      RecordingUploadRequest: {
        type: "object",
        required: ["sessionId", "recordingUrl", "fileSizeBytes"],
        properties: {
          sessionId: { type: "integer", example: 501 },
          recordingUrl: { type: "string", format: "uri", example: "https://storage.acmecorp.com/recordings/session-000501.mp4" },
          fileSizeBytes: { type: "integer", example: 157286400 },
          uploadStatus: { type: "string", enum: ["completed", "failed"], default: "completed" },
          checksum: { type: "string", description: "SHA-256 hex digest for integrity verification" },
          mimeType: { type: "string", example: "video/mp4" },
        },
      },
      RecordingUploadResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          sessionId: { type: "integer" },
          recordingUrl: { type: "string" },
          fileSizeBytes: { type: "integer" },
          uploadStatus: { type: "string" },
          storedAt: { type: "string", format: "date-time" },
          viewUrl: { type: "string", example: "/api/sessions/501" },
        },
      },
      // ---- Device Status ----
      DeviceStatusRequest: {
        type: "object",
        required: ["deviceId", "isOnline"],
        properties: {
          deviceId: { type: "integer", example: 42 },
          isOnline: { type: "boolean" },
          agentVersion: { type: "string", example: "2.4.1" },
          metadata: { type: "object", additionalProperties: { type: "string" } },
        },
      },
      DeviceStatusResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          deviceId: { type: "integer" },
          isOnline: { type: "boolean" },
          agentVersion: { type: "string" },
          lastSeenAt: { type: "string", format: "date-time" },
        },
      },
      // ---- User Auth ----
      UserLoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", example: "admin" },
          password: { type: "string", example: "admin123" },
        },
      },
      UserLoginResponse: {
        type: "object",
        properties: {
          token: { type: "string", description: "24-hour Bearer JWT for dashboard access" },
          user: {
            type: "object",
            properties: {
              id: { type: "integer" },
              name: { type: "string" },
              email: { type: "string" },
              role: { type: "string" },
              avatarUrl: { type: "string", nullable: true },
            },
          },
        },
      },
    },
  },
  paths: {
    // ---- Agent Auth ----
    "/agent/register": {
      post: {
        tags: ["Agent Auth"],
        summary: "Register device",
        description: "Register a new device or re-register an existing one. Returns a unique `deviceId` and `apiToken` that the agent stores in its local configuration.",
        operationId: "agentRegister",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } } },
        responses: {
          201: { description: "Device registered", content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterResponse" } } } },
          200: { description: "Device re-registered (token rotated)", content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterResponse" } } } },
          400: { description: "Invalid request or user not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/agent/login": {
      post: {
        tags: ["Agent Auth"],
        summary: "Agent login — get JWT",
        description: "Exchange `deviceId` + `apiToken` for a signed Agent JWT (1-hour TTL). Include the token as `Authorization: Bearer <token>` on all subsequent agent requests.",
        operationId: "agentLogin",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AgentLoginRequest" } } } },
        responses: {
          200: { description: "Agent JWT issued", content: { "application/json": { schema: { $ref: "#/components/schemas/AgentLoginResponse" } } } },
          401: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    // ---- Session Workflow ----
    "/session/start": {
      post: {
        tags: ["Session Workflow"],
        summary: "Start recording session",
        description: "Creates a new session record and returns a `sessionId`. Call immediately before the agent begins capturing video.",
        operationId: "sessionStart",
        security: [{ AgentAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SessionStartRequest" } } } },
        responses: {
          201: { description: "Session created", content: { "application/json": { schema: { $ref: "#/components/schemas/SessionStartResponse" } } } },
          401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          403: { description: "Forbidden — JWT device mismatch", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/session/heartbeat": {
      post: {
        tags: ["Session Workflow"],
        summary: "Heartbeat (every 30 s)",
        description: "Updates `durationSeconds` and `recordingSizeBytes` on the active session. Call every 30 seconds while recording is active.",
        operationId: "sessionHeartbeat",
        security: [{ AgentAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/HeartbeatRequest" } } } },
        responses: {
          200: { description: "Heartbeat received", content: { "application/json": { schema: { $ref: "#/components/schemas/HeartbeatResponse" } } } },
          401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Session not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/session/end": {
      post: {
        tags: ["Session Workflow"],
        summary: "End recording session",
        description: "Finalizes the session with a `logoutTime` and `durationSeconds`. After calling this, call `POST /recording/upload` to report the cloud storage URL.",
        operationId: "sessionEnd",
        security: [{ AgentAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SessionEndRequest" } } } },
        responses: {
          200: { description: "Session finalized", content: { "application/json": { schema: { $ref: "#/components/schemas/SessionEndResponse" } } } },
          401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Session not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    // ---- Recording ----
    "/recording/upload": {
      post: {
        tags: ["Recording"],
        summary: "Report recording upload",
        description: "After the agent uploads the recording file to cloud storage, call this endpoint with the resulting URL. The dashboard will then display a playback link.",
        operationId: "recordingUpload",
        security: [{ AgentAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RecordingUploadRequest" } } } },
        responses: {
          200: { description: "Recording URL stored", content: { "application/json": { schema: { $ref: "#/components/schemas/RecordingUploadResponse" } } } },
          401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Session not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    // ---- Device ----
    "/device/status": {
      post: {
        tags: ["Device"],
        summary: "Update device status",
        description: "Reports device online/offline status. Call on startup, graceful shutdown, and as a periodic keep-alive.",
        operationId: "deviceStatus",
        security: [{ AgentAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/DeviceStatusRequest" } } } },
        responses: {
          200: { description: "Status updated", content: { "application/json": { schema: { $ref: "#/components/schemas/DeviceStatusResponse" } } } },
          401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Device not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    // ---- User Auth ----
    "/auth/login": {
      post: {
        tags: ["User Auth"],
        summary: "User login",
        description: "Authenticate a dashboard user. Returns a 24-hour JWT. Default credentials: `admin` / `admin123`.",
        operationId: "userLogin",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UserLoginRequest" } } } },
        responses: {
          200: { description: "Authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/UserLoginResponse" } } } },
          401: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    // ---- Dashboard ----
    "/dashboard": {
      get: {
        tags: ["Dashboard"],
        summary: "Platform statistics",
        description: "Returns aggregate stats: online users, active sessions, storage used, failed uploads.",
        operationId: "getDashboard",
        security: [{ UserAuth: [] }],
        responses: {
          200: {
            description: "Stats",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    totalUsers: { type: "integer" }, onlineUsers: { type: "integer" },
                    activeRecordingSessions: { type: "integer" }, todaysSessions: { type: "integer" },
                    cloudStorageUsedBytes: { type: "integer" }, failedUploads: { type: "integer" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/sessions": {
      get: {
        tags: ["Dashboard"],
        summary: "List sessions",
        operationId: "listSessions",
        security: [{ UserAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "userId", in: "query", schema: { type: "integer" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["pending", "uploading", "completed", "failed"] } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Search by user name or device hostname" },
        ],
        responses: {
          200: { description: "Session list with pagination" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/sessions/{id}": {
      get: {
        tags: ["Dashboard"],
        summary: "Get session detail",
        operationId: "getSession",
        security: [{ UserAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Session with user and device" },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
        },
      },
    },
    "/users": {
      get: {
        tags: ["Dashboard"],
        summary: "List users",
        operationId: "listUsers",
        security: [{ UserAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "User list" }, 401: { description: "Unauthorized" } },
      },
    },
    "/devices": {
      get: {
        tags: ["Dashboard"],
        summary: "List devices",
        operationId: "listDevices",
        security: [{ UserAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "os", in: "query", schema: { type: "string", enum: ["Windows", "macOS", "Linux"] } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Device list" }, 401: { description: "Unauthorized" } },
      },
    },
    // ---- System ----
    "/healthz": {
      get: {
        tags: ["System"],
        summary: "Health check",
        operationId: "healthCheck",
        responses: { 200: { description: "OK", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", example: "ok" } } } } } } },
      },
    },
    "/docs": {
      get: { tags: ["System"], summary: "API documentation (Swagger UI)", operationId: "getDocs", responses: { 200: { description: "HTML page" } } },
    },
    "/docs/spec.json": {
      get: { tags: ["System"], summary: "OpenAPI 3.0 specification (JSON)", operationId: "getSpec", responses: { 200: { description: "OpenAPI spec" } } },
    },
  },
};

router.get("/docs/spec.json", (_req, res): void => {
  res.json(SPEC);
});

router.get("/docs", (_req, res): void => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cloud Session Recorder — API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css" />
  <style>
    body { margin: 0; background: #0f1117; }
    .swagger-ui { background: #0f1117; }
    .swagger-ui .topbar { background: #13161e; border-bottom: 1px solid #2a2d3a; }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
    .swagger-ui .info .title { color: #e2e8f0; }
    .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info table td,
    .swagger-ui .info .markdown p { color: #94a3b8; }
    .swagger-ui .info .title small pre { background: #1e2130; }
    .swagger-ui .opblock { background: #13161e; border-color: #2a2d3a; }
    .swagger-ui .opblock .opblock-summary { background: #1a1d2e; }
    .swagger-ui section.models { background: #13161e; }
    .swagger-ui .model-box { background: #1a1d2e; }
    .swagger-ui .opblock-body pre.microlight { background: #0d1017; }
    .swagger-ui select, .swagger-ui textarea, .swagger-ui input[type=text],
    .swagger-ui input[type=password], .swagger-ui input[type=email] {
      background: #1a1d2e; color: #e2e8f0; border-color: #3a3f58;
    }
    .swagger-ui .btn { background: #1e40af; color: white; }
    .swagger-ui .btn:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: "/api/docs/spec.json",
      dom_id: "#swagger-ui",
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: "StandaloneLayout",
      deepLinking: true,
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 2,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    });
  </script>
</body>
</html>`);
});

export default router;
