/**
 * ApplicationUsage — per-app time breakdown for a session.
 *
 * Currently uses deterministic mock data seeded from sessionId.
 * Future: replace generateAppUsage(...) with useListSessionApps(sessionId).
 */
import { useState, useMemo } from "react";
import { AppWindow, Search, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppUsageEntry {
  id: string;
  appName: string;
  executableName: string;
  windowTitle: string;
  category: "productivity" | "browser" | "communication" | "development" | "system" | "other";
  firstOpened: Date;
  lastActive: Date;
  totalSeconds: number;
  sessionPercent: number;   // 0–100
  focusCount: number;       // number of times focused
}

// ─── Catalog ──────────────────────────────────────────────────────────────────

interface AppTemplate {
  appName: string;
  executableName: string;
  category: AppUsageEntry["category"];
  titles: string[];
}

const APP_CATALOG: AppTemplate[] = [
  { appName: "Microsoft Edge", executableName: "msedge.exe", category: "browser", titles: ["SharePoint · HR Portal", "Confluence · Engineering Wiki", "GitHub — Pull Requests", "Jira Software — Sprint Board", "Azure DevOps — Pipelines"] },
  { appName: "Microsoft Teams", executableName: "Teams.exe", category: "communication", titles: ["Meeting: Q2 Planning", "Chat — #engineering", "Screen Share — Client Demo", "Meeting: Daily Standup"] },
  { appName: "Microsoft Outlook", executableName: "OUTLOOK.EXE", category: "communication", titles: ["Inbox (247 unread)", "Compose — Security Policy Update", "Calendar — This Week"] },
  { appName: "Visual Studio Code", executableName: "Code.exe", category: "development", titles: ["project/src/main.ts — VSCode", "api-server/routes/index.ts", "lib/db/schema/sessions.ts"] },
  { appName: "Microsoft Excel", executableName: "EXCEL.EXE", category: "productivity", titles: ["Q2_Budget_Final.xlsx", "Employee_Roster_2026.xlsx", "Quarterly_Report_Draft.xlsx"] },
  { appName: "Microsoft Word", executableName: "WINWORD.EXE", category: "productivity", titles: ["Security_Policy_v3.docx", "Meeting_Notes_July.docx", "Onboarding_Checklist.docx"] },
  { appName: "Slack", executableName: "slack.exe", category: "communication", titles: ["#general · Acme Corp", "#engineering-team", "#alerts · Production Monitor"] },
  { appName: "Windows Explorer", executableName: "explorer.exe", category: "system", titles: ["C:\\Users\\Documents", "C:\\Users\\Downloads", "\\\\fileserver\\shared\\Finance"] },
  { appName: "PowerShell", executableName: "powershell.exe", category: "development", titles: ["Administrator: Windows PowerShell", "Windows PowerShell"] },
  { appName: "Notepad++", executableName: "notepad++.exe", category: "development", titles: ["config.yml — Notepad++", "deploy.sh — Notepad++"] },
  { appName: "Google Chrome", executableName: "chrome.exe", category: "browser", titles: ["Gmail — Corporate Mail", "Google Docs — Q3 Roadmap"] },
  { appName: "Adobe Acrobat", executableName: "Acrobat.exe", category: "productivity", titles: ["Annual_Compliance_Report.pdf", "Contract_NDA_Signed.pdf"] },
];

const CATEGORY_COLORS: Record<AppUsageEntry["category"], string> = {
  productivity:  "bg-violet-500/20 text-violet-400 border-violet-500/30",
  browser:       "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  communication: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  development:   "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  system:        "bg-muted text-muted-foreground border-border/50",
  other:         "bg-muted text-muted-foreground border-border/50",
};

function fmtDur(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function seededRand(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = ((s * 1664525 + 1013904223) | 0) >>> 0;
    return s / 0xffffffff;
  };
}

function addSeconds(d: Date, s: number): Date {
  return new Date(d.getTime() + s * 1000);
}

// ─── Generator ────────────────────────────────────────────────────────────────

export function generateAppUsage(
  sessionId: number,
  loginTime: Date,
  durationSeconds: number,
): AppUsageEntry[] {
  const rand = seededRand(sessionId * 137 + 42);

  // Pick 4–7 apps
  const count = 4 + Math.floor(rand() * 4);
  const shuffled = [...APP_CATALOG].sort(() => rand() - 0.5).slice(0, count);

  // Allocate percentages that sum to ~97%
  const rawWeights = shuffled.map(() => 0.1 + rand() * 0.9);
  const total = rawWeights.reduce((a, b) => a + b, 0);
  const percs = rawWeights.map((w) => Math.round((w / total) * 97));

  // Adjust so they sum exactly to 97
  const diff = 97 - percs.reduce((a, b) => a + b, 0);
  percs[0] += diff;

  const entries: AppUsageEntry[] = shuffled.map((app, i) => {
    const pct = percs[i];
    const totalSeconds = Math.round((pct / 100) * durationSeconds);
    const firstOpened = addSeconds(loginTime, Math.floor(rand() * Math.min(300, durationSeconds * 0.1)));
    const lastActive = addSeconds(loginTime, durationSeconds - Math.floor(rand() * 300));
    const titleIdx = Math.floor(rand() * app.titles.length);
    const focusCount = 1 + Math.floor(rand() * 12);

    return {
      id: `${sessionId}-app-${i}`,
      appName: app.appName,
      executableName: app.executableName,
      windowTitle: app.titles[titleIdx],
      category: app.category,
      firstOpened,
      lastActive,
      totalSeconds,
      sessionPercent: pct,
      focusCount,
    };
  });

  // Sort by time descending
  return entries.sort((a, b) => b.totalSeconds - a.totalSeconds);
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

type SortKey = "appName" | "totalSeconds" | "sessionPercent" | "focusCount" | "firstOpened";

function SortIcon({ col, active, dir }: { col: string; active: string; dir: "asc" | "desc" }) {
  if (col !== active) return <ArrowUpDown className="w-3 h-3 opacity-40 ml-1" />;
  return dir === "asc"
    ? <ArrowUp className="w-3 h-3 ml-1 text-primary" />
    : <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  sessionId: number;
  loginTime: string | Date;
  durationSeconds?: number | null;
  /** Future: pass real entries from API to replace mock data */
  entries?: AppUsageEntry[];
}

const CATEGORIES_FILTER = [
  { value: "all", label: "All Categories" },
  { value: "browser", label: "Browser" },
  { value: "communication", label: "Communication" },
  { value: "productivity", label: "Productivity" },
  { value: "development", label: "Development" },
  { value: "system", label: "System" },
];

export default function ApplicationUsage({ sessionId, loginTime, durationSeconds, entries: externalEntries }: Props) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("totalSeconds");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const dur = durationSeconds ?? 3600;

  const allEntries = useMemo(() => {
    if (externalEntries) return externalEntries;
    return generateAppUsage(sessionId, new Date(loginTime), dur);
  }, [sessionId, loginTime, dur, externalEntries]);

  const displayed = useMemo(() => {
    let list = allEntries.filter((e) => {
      const matchCat = catFilter === "all" || e.category === catFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || e.appName.toLowerCase().includes(q) || e.executableName.toLowerCase().includes(q) || e.windowTitle.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });

    list = [...list].sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortKey === "appName") { av = a.appName; bv = b.appName; }
      else if (sortKey === "firstOpened") { av = a.firstOpened.getTime(); bv = b.firstOpened.getTime(); }
      else { av = a[sortKey] as number; bv = b[sortKey] as number; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [allEntries, search, catFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const thCls = "px-3 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none";

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search applications…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-background/50"
          />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="h-8 text-xs w-44 bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES_FILTER.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center text-[10px] text-muted-foreground font-mono shrink-0 px-2">
          {displayed.length}/{allEntries.length}
        </div>
      </div>

      {/* Table */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50 gap-2">
          <AppWindow className="w-6 h-6" />
          <p className="text-xs">No applications match your filter</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/20 border-b border-border/50">
                <tr>
                  <th className={thCls} onClick={() => toggleSort("appName")}>
                    <span className="flex items-center">Application <SortIcon col="appName" active={sortKey} dir={sortDir} /></span>
                  </th>
                  <th className={`${thCls} hidden md:table-cell`}>Window / Executable</th>
                  <th className={`${thCls} hidden lg:table-cell`} onClick={() => toggleSort("firstOpened")}>
                    <span className="flex items-center">First Opened <SortIcon col="firstOpened" active={sortKey} dir={sortDir} /></span>
                  </th>
                  <th className={thCls} onClick={() => toggleSort("totalSeconds")}>
                    <span className="flex items-center">Usage <SortIcon col="totalSeconds" active={sortKey} dir={sortDir} /></span>
                  </th>
                  <th className={thCls} onClick={() => toggleSort("sessionPercent")}>
                    <span className="flex items-center">% Session <SortIcon col="sessionPercent" active={sortKey} dir={sortDir} /></span>
                  </th>
                  <th className={`${thCls} hidden sm:table-cell`} onClick={() => toggleSort("focusCount")}>
                    <span className="flex items-center">Focuses <SortIcon col="focusCount" active={sortKey} dir={sortDir} /></span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {displayed.map((entry) => (
                  <tr key={entry.id} className="group hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded bg-muted/40 border border-border/50 flex items-center justify-center shrink-0">
                          <AppWindow className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium text-sm leading-snug">{entry.appName}</div>
                          <span className={`text-[10px] px-1.5 py-0 rounded border leading-none inline-block mt-0.5 ${CATEGORY_COLORS[entry.category]}`}>
                            {entry.category}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={entry.windowTitle}>
                        {entry.windowTitle}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">
                        {entry.executableName}
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <div className="font-mono text-xs text-muted-foreground">
                        {entry.firstOpened.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress value={entry.sessionPercent} className="h-1.5 w-16 shrink-0" />
                        <span className="font-mono text-xs text-primary tabular-nums shrink-0">{fmtDur(entry.totalSeconds)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-8 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                          <div className="h-full bg-primary/70 rounded-full" style={{ width: `${entry.sessionPercent}%` }} />
                        </div>
                        <span className="font-mono text-xs tabular-nums">{entry.sessionPercent}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell">
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">{entry.focusCount}×</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          <div className="px-4 py-2.5 bg-muted/10 border-t border-border/50 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-mono">
              {displayed.length} application{displayed.length !== 1 ? "s" : ""} · total captured time: {fmtDur(displayed.reduce((s, e) => s + e.totalSeconds, 0))}
            </span>
            <a
              href="#"
              className="text-[10px] text-primary/60 hover:text-primary flex items-center gap-1 transition-colors"
              onClick={(e) => e.preventDefault()}
              title="Export to CSV — coming soon"
            >
              Export CSV <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
