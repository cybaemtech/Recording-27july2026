import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Play, Copy, ChevronRight, CheckCircle2, XCircle,
  Zap, AlertTriangle, Clock, Terminal, RefreshCw
} from "lucide-react";

// ─── Endpoint catalog ─────────────────────────────────────────────────────────

interface Endpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  category: string;
  description: string;
  authType: "none" | "user" | "agent";
  bodyTemplate?: Record<string, unknown>;
  pathParams?: string[];
  queryParams?: string;
  docUrl?: string;
  flow?: string; // hints about the natural order
}

const ENDPOINTS: Endpoint[] = [
  // ── Agent Auth ──────────────────────────────────────────────────────────────
  {
    id: "agent-register",
    method: "POST",
    path: "/api/agent/register",
    category: "1. Agent Auth",
    description: "Register device, get deviceId + apiToken",
    authType: "none",
    bodyTemplate: {
      hostname: "CORP-WS-001",
      operatingSystem: "Windows",
      agentVersion: "2.4.1",
      userId: 1,
    },
    flow: "Start here → then agent-login",
  },
  {
    id: "agent-login",
    method: "POST",
    path: "/api/agent/login",
    category: "1. Agent Auth",
    description: "Exchange deviceId + apiToken for a JWT",
    authType: "none",
    bodyTemplate: { deviceId: 0, apiToken: "" },
    flow: "After register → use returned JWT for session calls",
  },
  // ── Session Workflow ─────────────────────────────────────────────────────────
  {
    id: "session-start",
    method: "POST",
    path: "/api/session/start",
    category: "2. Session Workflow",
    description: "Start a new recording session",
    authType: "agent",
    bodyTemplate: { deviceId: 0 },
    flow: "After agent-login",
  },
  {
    id: "session-heartbeat",
    method: "POST",
    path: "/api/session/heartbeat",
    category: "2. Session Workflow",
    description: "Send heartbeat — update duration + size",
    authType: "agent",
    bodyTemplate: {
      sessionId: 0,
      durationSeconds: 30,
      recordingSizeBytes: 5242880,
      recordingStatus: "active",
    },
    flow: "Every 30 s while recording",
  },
  {
    id: "session-end",
    method: "POST",
    path: "/api/session/end",
    category: "2. Session Workflow",
    description: "Finalize and close the session",
    authType: "agent",
    bodyTemplate: {
      sessionId: 0,
      durationSeconds: 3600,
      recordingSizeBytes: 157286400,
      recordingStatus: "completed",
    },
    flow: "When user logs off",
  },
  // ── Recording ────────────────────────────────────────────────────────────────
  {
    id: "recording-upload",
    method: "POST",
    path: "/api/recording/upload",
    category: "3. Recording",
    description: "Report cloud upload complete, store URL",
    authType: "agent",
    bodyTemplate: {
      sessionId: 0,
      recordingUrl: "https://storage.acmecorp.com/recordings/session-000001.mp4",
      fileSizeBytes: 157286400,
      uploadStatus: "completed",
      checksum: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    },
    flow: "After session-end",
  },
  // ── Device ───────────────────────────────────────────────────────────────────
  {
    id: "device-status",
    method: "POST",
    path: "/api/device/status",
    category: "4. Device",
    description: "Report online/offline status + agent version",
    authType: "agent",
    bodyTemplate: { deviceId: 0, isOnline: true, agentVersion: "2.4.1" },
    flow: "On startup and shutdown",
  },
  // ── Dashboard ────────────────────────────────────────────────────────────────
  {
    id: "get-dashboard",
    method: "GET",
    path: "/api/dashboard",
    category: "5. Dashboard (User)",
    description: "Platform statistics and counters",
    authType: "user",
  },
  {
    id: "get-sessions",
    method: "GET",
    path: "/api/sessions?page=1&limit=5",
    category: "5. Dashboard (User)",
    description: "Paginated session list with filters",
    authType: "user",
  },
  {
    id: "get-session-detail",
    method: "GET",
    path: "/api/sessions/1",
    category: "5. Dashboard (User)",
    description: "Full session detail with user + device",
    authType: "user",
  },
  {
    id: "get-users",
    method: "GET",
    path: "/api/users?page=1&limit=5",
    category: "5. Dashboard (User)",
    description: "Paginated user list with search",
    authType: "user",
  },
  {
    id: "get-devices",
    method: "GET",
    path: "/api/devices?page=1&limit=5",
    category: "5. Dashboard (User)",
    description: "Paginated device list with OS filter",
    authType: "user",
  },
  // ── Auth ──────────────────────────────────────────────────────────────────────
  {
    id: "user-login",
    method: "POST",
    path: "/api/auth/login",
    category: "6. User Auth",
    description: "Login as dashboard user, get JWT",
    authType: "none",
    bodyTemplate: { email: "admin", password: "admin123" },
  },
  // ── System ────────────────────────────────────────────────────────────────────
  {
    id: "health",
    method: "GET",
    path: "/api/healthz",
    category: "7. System",
    description: "Health check",
    authType: "none",
  },
];

const CATEGORIES = [...new Set(ENDPOINTS.map((e) => e.category))];

const METHOD_COLORS: Record<string, string> = {
  GET:    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  POST:   "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PUT:    "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
};

const AUTH_BADGE: Record<string, { label: string; cls: string }> = {
  none:  { label: "Public",     cls: "bg-muted text-muted-foreground" },
  user:  { label: "User JWT",   cls: "bg-primary/20 text-primary border-primary/30" },
  agent: { label: "Agent JWT",  cls: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
};

// ─── Stored session variables (auto-filled from responses) ────────────────────

interface SessionVars {
  userToken?: string;
  agentToken?: string;
  deviceId?: number;
  apiToken?: string;
  sessionId?: number;
}

function extractVars(body: Record<string, unknown>): Partial<SessionVars> {
  const out: Partial<SessionVars> = {};
  if (typeof body.token === "string") {
    // Heuristic: agent JWT contains type:agent in payload
    try {
      const parts = body.token.split(".");
      if (parts.length === 3) {
        const p = JSON.parse(atob(parts[1]));
        if (p.type === "agent") out.agentToken = body.token;
        else out.userToken = body.token;
      }
    } catch { /* ok */ }
  }
  if (typeof body.deviceId === "number") out.deviceId = body.deviceId;
  if (typeof body.apiToken === "string") out.apiToken = body.apiToken;
  if (typeof body.sessionId === "number") out.sessionId = body.sessionId;
  return out;
}

function applySessionVars(
  template: Record<string, unknown>,
  vars: SessionVars
): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...template };
  if ("deviceId" in copy && vars.deviceId) copy.deviceId = vars.deviceId;
  if ("apiToken" in copy && vars.apiToken) copy.apiToken = vars.apiToken;
  if ("sessionId" in copy && vars.sessionId) copy.sessionId = vars.sessionId;
  return copy;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ApiConsole() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Endpoint>(ENDPOINTS[0]);
  const [bodyText, setBodyText] = useState<string>(
    JSON.stringify(ENDPOINTS[0].bodyTemplate ?? {}, null, 2)
  );
  const [authToken, setAuthToken] = useState<string>(
    () => localStorage.getItem("token") ?? ""
  );
  const [response, setResponse] = useState<{
    status: number;
    statusText: string;
    body: string;
    duration: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionVars, setSessionVars] = useState<SessionVars>({});
  const [bodyError, setBodyError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const selectEndpoint = useCallback(
    (ep: Endpoint) => {
      setSelected(ep);
      setResponse(null);
      setBodyError(null);
      const tmpl = ep.bodyTemplate
        ? applySessionVars(ep.bodyTemplate, sessionVars)
        : null;
      setBodyText(tmpl ? JSON.stringify(tmpl, null, 2) : "");
    },
    [sessionVars]
  );

  const getEffectiveToken = () => {
    if (selected.authType === "agent") return sessionVars.agentToken ?? authToken;
    if (selected.authType === "user") return sessionVars.userToken ?? authToken;
    return "";
  };

  const execute = async () => {
    // Validate body JSON
    let parsedBody: Record<string, unknown> | undefined;
    if (selected.method !== "GET" && bodyText.trim()) {
      try {
        parsedBody = JSON.parse(bodyText);
      } catch {
        setBodyError("Invalid JSON — fix before sending");
        return;
      }
    }
    setBodyError(null);
    setLoading(true);
    const start = performance.now();

    try {
      const token = getEffectiveToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(selected.path, {
        method: selected.method,
        headers,
        ...(parsedBody ? { body: JSON.stringify(parsedBody) } : {}),
      });

      const duration = Math.round(performance.now() - start);
      let text = await res.text();
      let formatted = text;
      try {
        formatted = JSON.stringify(JSON.parse(text), null, 2);
        const parsed = JSON.parse(text);
        // Auto-extract session variables
        const extracted = extractVars(parsed);
        if (Object.keys(extracted).length > 0) {
          setSessionVars((prev) => ({ ...prev, ...extracted }));
          if (extracted.deviceId || extracted.apiToken || extracted.agentToken || extracted.sessionId) {
            const what = Object.keys(extracted)
              .map((k) => {
                if (k === "agentToken") return "agentToken";
                if (k === "userToken") return "userToken";
                return k;
              })
              .join(", ");
            toast({
              title: "Session vars updated",
              description: `Stored ${what} for subsequent requests`,
            });
          }
        }
      } catch { /* not JSON */ }

      setResponse({ status: res.status, statusText: res.statusText, body: formatted, duration });
    } catch (err: unknown) {
      const duration = Math.round(performance.now() - start);
      setResponse({
        status: 0,
        statusText: "Network Error",
        body: String(err),
        duration,
      });
    } finally {
      setLoading(false);
    }
  };

  const toCurl = () => {
    const token = getEffectiveToken();
    const lines: string[] = [`curl -X ${selected.method} \\`];
    lines.push(`  "${window.location.origin}${selected.path}" \\`);
    lines.push(`  -H "Content-Type: application/json" \\`);
    if (token) lines.push(`  -H "Authorization: Bearer ${token.slice(0, 20)}..." \\`);
    if (bodyText.trim() && selected.method !== "GET") {
      lines.push(`  -d '${bodyText.replace(/\n/g, " ")}'`);
    } else {
      // Remove trailing backslash from last line
      const last = lines[lines.length - 1];
      lines[lines.length - 1] = last.replace(" \\", "");
    }
    navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: "Copied cURL command" });
  };

  const clearVars = () => {
    setSessionVars({});
    toast({ title: "Session variables cleared" });
  };

  const statusColor =
    response === null
      ? ""
      : response.status >= 200 && response.status < 300
      ? "text-emerald-400"
      : response.status >= 400
      ? "text-red-400"
      : "text-amber-400";

  return (
    <div className="flex gap-0 rounded-lg border border-border/50 overflow-hidden bg-card/30" style={{ minHeight: 600 }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div className="w-72 shrink-0 border-r border-border/50 bg-black/20 overflow-y-auto">
        <div className="p-3 border-b border-border/50">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Endpoints
          </h3>
        </div>

        {CATEGORIES.map((cat) => (
          <div key={cat}>
            <div className="px-3 py-2 bg-muted/10">
              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                {cat.replace(/^\d+\. /, "")}
              </span>
            </div>
            {ENDPOINTS.filter((e) => e.category === cat).map((ep) => (
              <button
                key={ep.id}
                onClick={() => selectEndpoint(ep)}
                className={`w-full text-left px-3 py-2.5 border-b border-border/30 transition-colors hover:bg-primary/5 ${
                  selected.id === ep.id ? "bg-primary/10 border-l-2 border-l-primary" : ""
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      METHOD_COLORS[ep.method]
                    }`}
                  >
                    {ep.method}
                  </span>
                  {selected.id === ep.id && (
                    <ChevronRight className="w-3 h-3 text-primary ml-auto" />
                  )}
                </div>
                <div className="font-mono text-xs text-foreground/80 truncate">
                  {ep.path.replace(/\?.*$/, "")}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {ep.description}
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* ── Main panel ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Request header */}
        <div className="p-4 border-b border-border/50 bg-black/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded border ${
                    METHOD_COLORS[selected.method]
                  }`}
                >
                  {selected.method}
                </span>
                <code className="font-mono text-sm text-primary truncate">{selected.path}</code>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    AUTH_BADGE[selected.authType].cls
                  }`}
                >
                  {AUTH_BADGE[selected.authType].label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{selected.description}</p>
              {selected.flow && (
                <p className="text-[10px] text-primary/60 mt-0.5 font-mono">
                  ↳ {selected.flow}
                </p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={toCurl} className="gap-1.5 text-xs">
                <Terminal className="w-3.5 h-3.5" /> cURL
              </Button>
              <Button
                size="sm"
                onClick={execute}
                disabled={loading}
                className="gap-1.5 text-xs"
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Send
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Request body */}
          <div className="w-1/2 border-r border-border/50 flex flex-col">
            <div className="px-4 py-2 border-b border-border/30 bg-black/5 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">REQUEST</span>
              {bodyError && (
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {bodyError}
                </span>
              )}
            </div>

            {/* Auth token input */}
            {selected.authType !== "none" && (
              <div className="px-4 pt-3">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Authorization Token
                  {selected.authType === "agent" && sessionVars.agentToken
                    ? " (auto-filled from agent-login)"
                    : selected.authType === "user" && sessionVars.userToken
                    ? " (auto-filled from user-login)"
                    : ""}
                </label>
                <input
                  type="text"
                  className="w-full bg-background/40 border border-border/50 rounded px-3 py-1.5 text-xs font-mono text-muted-foreground focus:outline-none focus:border-primary/50"
                  placeholder="Paste JWT or auto-filled from previous request"
                  value={getEffectiveToken()}
                  onChange={(e) => {
                    setAuthToken(e.target.value);
                    if (selected.authType === "agent")
                      setSessionVars((v) => ({ ...v, agentToken: e.target.value }));
                    else if (selected.authType === "user")
                      setSessionVars((v) => ({ ...v, userToken: e.target.value }));
                  }}
                />
              </div>
            )}

            {/* Body editor */}
            {selected.method !== "GET" && (
              <div className="flex-1 flex flex-col px-4 pt-3 pb-4 min-h-0">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Request Body (JSON)
                </label>
                <textarea
                  ref={bodyRef}
                  className={`flex-1 w-full bg-black/30 border rounded p-3 text-xs font-mono resize-none focus:outline-none focus:border-primary/50 ${
                    bodyError ? "border-red-500/50" : "border-border/50"
                  }`}
                  value={bodyText}
                  onChange={(e) => {
                    setBodyText(e.target.value);
                    setBodyError(null);
                  }}
                  spellCheck={false}
                  style={{ minHeight: 200 }}
                />
              </div>
            )}
            {selected.method === "GET" && (
              <div className="flex-1 flex items-center justify-center text-muted-foreground/40 text-xs font-mono">
                GET — no request body
              </div>
            )}

            {/* Session vars */}
            {Object.keys(sessionVars).length > 0 && (
              <div className="px-4 pb-3 border-t border-border/30 pt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Session Variables (auto-fill)
                  </span>
                  <button
                    onClick={clearVars}
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-0.5">
                  {Object.entries(sessionVars).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-primary/60 w-24 shrink-0">{k}</span>
                      <span className="text-muted-foreground truncate">
                        {typeof v === "string" && v.length > 30
                          ? v.slice(0, 30) + "..."
                          : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Response */}
          <div className="w-1/2 flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-border/30 bg-black/5 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">RESPONSE</span>
              {response && (
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold font-mono ${statusColor}`}>
                    {response.status > 0 ? response.status : "ERR"}{" "}
                    {response.statusText}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {response.duration}ms
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(response.body);
                      toast({ title: "Copied response" });
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-4">
              {!response && !loading && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground/40">
                  <Zap className="w-8 h-8" />
                  <div className="text-xs font-mono text-center">
                    Press <span className="text-primary">Send</span> to execute the request
                  </div>
                </div>
              )}
              {loading && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground/40">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary/50" />
                  <div className="text-xs font-mono">Waiting for response...</div>
                </div>
              )}
              {response && !loading && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {response.status >= 200 && response.status < 300 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <span className={`text-sm font-semibold ${statusColor}`}>
                      {response.status} {response.statusText}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {response.duration}ms
                    </span>
                  </div>
                  <pre className="bg-black/40 border border-border/50 rounded p-4 text-xs font-mono overflow-auto whitespace-pre-wrap break-all leading-relaxed text-foreground/80">
                    {response.body}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer: link to full Swagger docs */}
        <div className="px-4 py-2.5 border-t border-border/50 bg-black/10 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-mono">
            All 13 endpoints • JWT auth • Swagger UI available
          </span>
          <a
            href="/api/docs"
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-primary hover:underline flex items-center gap-1"
          >
            Open Swagger UI <ChevronRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
