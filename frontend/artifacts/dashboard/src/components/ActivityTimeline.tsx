/**
 * ActivityTimeline — rich session event log with search + filter.
 *
 * Currently uses deterministic mock data seeded from sessionId.
 * Future: swap `generateEvents(...)` for `useListSessionEvents(sessionId)`.
 */
import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  LogIn, LogOut, Radio, MonitorStop, Globe2, Coffee, Zap,
  PauseCircle, PlayCircle, CheckCircle2, Upload, XCircle,
  AppWindow, Search, SlidersHorizontal
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

// ─── Event types ──────────────────────────────────────────────────────────────

export type EventKind =
  | "login"
  | "session_start"
  | "recording_start"
  | "app_change"
  | "browser_open"
  | "idle"
  | "return"
  | "pause"
  | "resume"
  | "session_end"
  | "logout"
  | "upload_start"
  | "upload_done"
  | "upload_fail";

export interface TimelineEvent {
  id: string;
  kind: EventKind;
  title: string;
  description: string;
  timestamp: Date;
  /** Optional sub-label rendered in mono font (e.g. app name, PID) */
  detail?: string;
}

// ─── Visual config ────────────────────────────────────────────────────────────

const KIND_META: Record<EventKind, {
  icon: React.ElementType;
  color: string;  // icon + border
  bg: string;     // icon bg tint
  badge: string;  // badge text
  badgeVariant: "default" | "success" | "destructive" | "info" | "outline" | "warning";
}> = {
  login:          { icon: LogIn,         color: "text-emerald-500",  bg: "bg-emerald-500/10 border-emerald-500/30", badge: "Auth",       badgeVariant: "success" },
  session_start:  { icon: Radio,         color: "text-primary",       bg: "bg-primary/10 border-primary/30",        badge: "Session",    badgeVariant: "info" },
  recording_start:{ icon: PlayCircle,    color: "text-primary",       bg: "bg-primary/10 border-primary/30",        badge: "Recording",  badgeVariant: "info" },
  app_change:     { icon: AppWindow,     color: "text-foreground",    bg: "bg-muted/50 border-border/50",           badge: "App",        badgeVariant: "outline" },
  browser_open:   { icon: Globe2,        color: "text-cyan-400",      bg: "bg-cyan-500/10 border-cyan-500/30",      badge: "Browser",    badgeVariant: "outline" },
  idle:           { icon: Coffee,        color: "text-amber-400",     bg: "bg-amber-500/10 border-amber-500/30",    badge: "Idle",       badgeVariant: "warning" },
  return:         { icon: Zap,           color: "text-emerald-400",   bg: "bg-emerald-500/10 border-emerald-500/30",badge: "Active",     badgeVariant: "success" },
  pause:          { icon: PauseCircle,   color: "text-amber-400",     bg: "bg-amber-500/10 border-amber-500/30",    badge: "Paused",     badgeVariant: "warning" },
  resume:         { icon: PlayCircle,    color: "text-primary",       bg: "bg-primary/10 border-primary/30",        badge: "Resumed",    badgeVariant: "info" },
  session_end:    { icon: MonitorStop,   color: "text-muted-foreground", bg: "bg-muted/50 border-border/50",        badge: "Session",    badgeVariant: "outline" },
  logout:         { icon: LogOut,        color: "text-muted-foreground", bg: "bg-muted/50 border-border/50",        badge: "Auth",       badgeVariant: "outline" },
  upload_start:   { icon: Upload,        color: "text-primary",       bg: "bg-primary/10 border-primary/30",        badge: "Upload",     badgeVariant: "info" },
  upload_done:    { icon: CheckCircle2,  color: "text-emerald-500",   bg: "bg-emerald-500/10 border-emerald-500/30",badge: "Upload",     badgeVariant: "success" },
  upload_fail:    { icon: XCircle,       color: "text-destructive",   bg: "bg-destructive/10 border-destructive/30",badge: "Upload",     badgeVariant: "destructive" },
};

const KIND_LABELS: Record<EventKind, string> = {
  login: "Login", session_start: "Session Start", recording_start: "Recording Start",
  app_change: "App Change", browser_open: "Browser", idle: "Idle",
  return: "Return", pause: "Paused", resume: "Resumed",
  session_end: "Session End", logout: "Logout",
  upload_start: "Upload Start", upload_done: "Upload Done", upload_fail: "Upload Failed",
};

const CATEGORY_OPTIONS = [
  { value: "all",       label: "All Events" },
  { value: "auth",      label: "Auth (Login / Logout)" },
  { value: "recording", label: "Recording" },
  { value: "activity",  label: "User Activity" },
  { value: "upload",    label: "Upload" },
  { value: "idle",      label: "Idle / Return" },
];

const KIND_TO_CATEGORY: Record<EventKind, string> = {
  login: "auth", logout: "auth",
  session_start: "recording", session_end: "recording", recording_start: "recording", pause: "recording", resume: "recording",
  app_change: "activity", browser_open: "activity",
  idle: "idle", return: "idle",
  upload_start: "upload", upload_done: "upload", upload_fail: "upload",
};

// ─── Mock data generator ───────────────────────────────────────────────────────

const APPS = [
  { name: "Microsoft Teams", detail: "Teams.exe — Meeting: Q2 Planning" },
  { name: "Microsoft Outlook", detail: "OUTLOOK.EXE — Inbox (247 unread)" },
  { name: "Visual Studio Code", detail: "Code.exe — project/src/main.ts" },
  { name: "Microsoft Excel", detail: "EXCEL.EXE — Q2_Budget_Final.xlsx" },
  { name: "Microsoft Edge", detail: "msedge.exe — Confluence · Company Wiki" },
  { name: "Slack", detail: "slack.exe — #engineering-team" },
  { name: "Microsoft Word", detail: "WINWORD.EXE — Security_Policy_v3.docx" },
  { name: "Jira", detail: "msedge.exe — Sprint 24 Board" },
  { name: "Windows Explorer", detail: "explorer.exe — C:\\Users\\Documents" },
  { name: "PowerShell", detail: "powershell.exe — Administrator session" },
];

function seededRand(seed: number, n: number): number {
  // Simple LCG for reproducible pseudo-random values
  const v = ((seed * 1664525 + 1013904223) >>> 0) % n;
  return v;
}

function addSeconds(d: Date, s: number): Date {
  return new Date(d.getTime() + s * 1000);
}

export function generateEvents(
  sessionId: number,
  loginTime: Date,
  logoutTime: Date | null | undefined,
  durationSeconds: number | null | undefined,
  uploadStatus?: string,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const dur = durationSeconds ?? 3600;
  const end = logoutTime ?? addSeconds(loginTime, dur);
  let cursor = loginTime;
  let eid = 0;

  const push = (kind: EventKind, title: string, description: string, at: Date, detail?: string) => {
    events.push({ id: `${sessionId}-${eid++}`, kind, title, description, timestamp: at, detail });
  };

  // 1. Login
  push("login", "User authenticated", "Credentials verified — SSO token issued", cursor);
  cursor = addSeconds(cursor, seededRand(sessionId, 5) + 2);

  // 2. Session start
  push("session_start", "Recording session opened", "Agent connected to cloud relay — session ID allocated", cursor);
  cursor = addSeconds(cursor, seededRand(sessionId + 1, 8) + 3);

  // 3. Recording start
  push("recording_start", "Recording started", "Screen capture initiated at 1080p 60fps — AES-256 stream active", cursor);

  // 4. Scatter 4-8 app changes across the session
  const appCount = 4 + seededRand(sessionId + 2, 4);
  const spacing = Math.floor((dur - 120) / (appCount + 2));
  const usedApps = new Set<number>();

  for (let i = 0; i < appCount; i++) {
    cursor = addSeconds(cursor, spacing + seededRand(sessionId + i + 10, 60));
    if (cursor >= end) break;

    let appIdx: number;
    do { appIdx = seededRand(sessionId + i + 20, APPS.length); }
    while (usedApps.has(appIdx) && usedApps.size < APPS.length);
    usedApps.add(appIdx);
    const app = APPS[appIdx];

    // Every other one is browser or idle
    if (i === 1) {
      push("browser_open", "Browser window focused", "User switched to browser session", cursor, app.detail.includes("edge") || app.detail.includes("chrome") ? app.detail : "msedge.exe — SharePoint · HR Portal");
    } else if (i === Math.floor(appCount / 2)) {
      // Insert idle/return pair
      push("idle", "User became idle", `No input detected for ${2 + seededRand(sessionId + i, 8)} minutes — recording continues`, cursor);
      cursor = addSeconds(cursor, (2 + seededRand(sessionId + i + 3, 8)) * 60);
      if (cursor < end) {
        push("return", "User returned", "Keyboard/mouse activity resumed", cursor);
        cursor = addSeconds(cursor, 10);
      }
    } else {
      push("app_change", `Switched to ${app.name}`, "Focus changed to foreground application", cursor, app.detail);
    }
  }

  // Optional: pause/resume pair for some sessions
  if (seededRand(sessionId + 99, 3) === 0 && dur > 1800) {
    const pauseAt = addSeconds(loginTime, Math.floor(dur * 0.6));
    if (pauseAt < end) {
      push("pause", "Recording paused", "User initiated manual pause via agent tray", pauseAt);
      const resumeAt = addSeconds(pauseAt, 60 + seededRand(sessionId + 100, 120));
      if (resumeAt < end) {
        push("resume", "Recording resumed", "Recording restarted — no gap in cloud storage", resumeAt);
      }
    }
  }

  // Session end
  const endMinus = addSeconds(end, -5);
  push("session_end", "Session terminated", "Agent sent logout signal — recording pipeline closed", endMinus > loginTime ? endMinus : end);
  push("logout", "User logged out", "OS session closed — agent deregistered from relay", end);

  // Upload events for completed sessions
  if (uploadStatus === "uploading" || uploadStatus === "completed" || uploadStatus === "failed") {
    const uploadAt = addSeconds(end, 2);
    push("upload_start", "Upload initiated", "Encrypted recording queued to S3 cloud storage", uploadAt);
    if (uploadStatus === "completed") {
      push("upload_done", "Upload complete", "Recording available for review — checksums verified", addSeconds(uploadAt, 15 + seededRand(sessionId + 200, 60)));
    } else if (uploadStatus === "failed") {
      push("upload_fail", "Upload failed", "S3 PUT returned 503 — manual retry required", addSeconds(uploadAt, 30));
    }
  }

  // Sort chronologically
  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return events;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  sessionId: number;
  loginTime: string | Date;
  logoutTime?: string | Date | null;
  durationSeconds?: number | null;
  uploadStatus?: string;
  /** Future: pass real events from API to replace mock data */
  events?: TimelineEvent[];
}

export default function ActivityTimeline({
  sessionId,
  loginTime,
  logoutTime,
  durationSeconds,
  uploadStatus,
  events: externalEvents,
}: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const allEvents = useMemo(() => {
    if (externalEvents) return externalEvents;
    return generateEvents(
      sessionId,
      new Date(loginTime),
      logoutTime ? new Date(logoutTime) : null,
      durationSeconds,
      uploadStatus,
    );
  }, [sessionId, loginTime, logoutTime, durationSeconds, uploadStatus, externalEvents]);

  const filtered = useMemo(() => {
    return allEvents.filter((e) => {
      const matchCategory = category === "all" || KIND_TO_CATEGORY[e.kind] === category;
      const q = search.toLowerCase();
      const matchSearch = !q || e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || (e.detail?.toLowerCase().includes(q) ?? false) || KIND_LABELS[e.kind].toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [allEvents, search, category]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-background/50"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-xs w-40 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center text-[10px] text-muted-foreground font-mono shrink-0 px-2">
          {filtered.length}/{allEvents.length}
        </div>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50 gap-2">
          <Search className="w-6 h-6" />
          <p className="text-xs">No events match your filter</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-[13px] top-4 bottom-4 w-px bg-border/50" />

          <div className="space-y-0">
            {filtered.map((event, idx) => {
              const meta = KIND_META[event.kind];
              const Icon = meta.icon;
              const isLast = idx === filtered.length - 1;

              return (
                <div key={event.id} className={`flex gap-3 group ${isLast ? "" : "pb-4"}`}>
                  {/* Icon */}
                  <div className={`relative w-7 h-7 rounded border flex items-center justify-center shrink-0 z-10 ${meta.bg} ${meta.color} transition-shadow group-hover:shadow-[0_0_0_2px_hsl(var(--border))]`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5 pb-1 border-b border-border/20 last:border-0 group-hover:border-border/40 transition-colors">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium leading-snug">{event.title}</span>
                        <Badge variant={meta.badgeVariant} className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                          {meta.badge}
                        </Badge>
                      </div>
                      <time className="text-[10px] text-muted-foreground font-mono shrink-0 tabular-nums">
                        {format(event.timestamp, "HH:mm:ss")}
                      </time>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{event.description}</p>
                    {event.detail && (
                      <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 truncate">{event.detail}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
