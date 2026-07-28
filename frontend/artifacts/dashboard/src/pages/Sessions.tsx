import { useState } from "react";
import { Link } from "wouter";
import { useListSessions, useDeleteSession, getListSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { PlayCircle, Download, Trash2, Search, ChevronUp, ChevronDown, ChevronsUpDown, CheckCircle2, AlertTriangle, Monitor, Smartphone, Server, Eye, Video } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getOsIcon(os: string) {
  if (!os) return <Monitor className="w-3.5 h-3.5" />;
  const lower = os.toLowerCase();
  if (lower.includes('mac') || lower.includes('ios')) return <Smartphone className="w-3.5 h-3.5" />;
  if (lower.includes('linux')) return <Server className="w-3.5 h-3.5" />;
  return <Monitor className="w-3.5 h-3.5" />;
}

type SortField = "loginTime" | "durationSeconds" | "recordingSizeBytes" | "user" | "device";
type SortDir = "asc" | "desc";

function SortIcon({ field, active, dir }: { field: string; active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 ml-1 text-slate-300" />;
  return dir === "asc"
    ? <ChevronUp className="w-3 h-3 ml-1 text-indigo-600" />
    : <ChevronDown className="w-3 h-3 ml-1 text-indigo-600" />;
}

export default function Sessions() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("loginTime");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const limit = 20;

  const params: any = {
    page,
    limit,
    ...(search ? { search } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };

  const { data: response, isLoading } = useListSessions(params);
  const deleteSession = useDeleteSession();
  const queryClient = useQueryClient();

  let sessions = response?.data || [];
  const total = response?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Client-side sort on current page
  sessions = [...sessions].sort((a, b) => {
    let va: any, vb: any;
    if (sortField === "loginTime") { va = new Date(a.loginTime).getTime(); vb = new Date(b.loginTime).getTime(); }
    else if (sortField === "durationSeconds") { va = a.durationSeconds ?? -1; vb = b.durationSeconds ?? -1; }
    else if (sortField === "recordingSizeBytes") { va = a.recordingSizeBytes ?? -1; vb = b.recordingSizeBytes ?? -1; }
    else if (sortField === "user") { va = a.user.name; vb = b.user.name; }
    else if (sortField === "device") { va = a.device.name; vb = b.device.name; }
    if (va === undefined || vb === undefined) return 0;
    if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === "asc" ? va - vb : vb - va;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this recording? This cannot be undone.")) {
      await deleteSession.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey(params) });
    }
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatus = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Live Sessions & Recordings</h2>
          <p className="text-slate-500 text-sm mt-1">Monitor and manage all recorded desktop sessions across your organization.</p>
        </div>
        <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          {total} total records
        </div>
      </div>

      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-4 flex-wrap bg-white">
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by user or device..."
              className="pl-10 h-10 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 rounded-lg text-sm"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatus}>
            <SelectTrigger className="w-48 h-10 bg-slate-50 border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="uploading">Uploading</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          {(search || statusFilter !== "all") && (
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 h-10 px-4 rounded-lg font-medium" onClick={() => { setSearch(""); setStatusFilter("all"); setPage(1); }}>
              Clear filters
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 pl-6 w-[100px]">Session ID</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 cursor-pointer select-none group" onClick={() => handleSort("user")}>
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">
                    User <SortIcon field="user" active={sortField === "user"} dir={sortDir} />
                  </span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 cursor-pointer select-none group" onClick={() => handleSort("device")}>
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">
                    Device <SortIcon field="device" active={sortField === "device"} dir={sortDir} />
                  </span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 cursor-pointer select-none group" onClick={() => handleSort("loginTime")}>
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">
                    Started <SortIcon field="loginTime" active={sortField === "loginTime"} dir={sortDir} />
                  </span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 cursor-pointer select-none group" onClick={() => handleSort("durationSeconds")}>
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">
                    Duration <SortIcon field="durationSeconds" active={sortField === "durationSeconds"} dir={sortDir} />
                  </span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 cursor-pointer select-none group" onClick={() => handleSort("recordingSizeBytes")}>
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">
                    Size <SortIcon field="recordingSizeBytes" active={sortField === "recordingSizeBytes"} dir={sortDir} />
                  </span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-slate-400 text-sm font-medium">
                    Loading session data...
                  </TableCell>
                </TableRow>
              ) : sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-slate-500 text-sm">
                    No sessions found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session: any) => (
                  <TableRow key={session.id} className="border-slate-100 hover:bg-slate-50/80 cursor-pointer transition-colors group" onClick={(e) => {
                    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("a")) return;
                    window.location.href = `/sessions/${session.id}`;
                  }}>
                    <TableCell className="pl-6 font-mono text-[11px] font-semibold text-slate-500">
                      #{String(session.id).padStart(6, "0")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 py-1">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-[11px] shadow-sm shrink-0">
                          {session.user.name.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900">{session.user.name}</span>
                          <span className="text-[11px] text-slate-500">{session.user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-700">
                        <div className="w-7 h-7 rounded-md bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          {getOsIcon(session.device.operatingSystem)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">{session.device.name}</span>
                          <span className="text-[10px] text-slate-500">{session.device.operatingSystem}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-700 font-medium">
                          {format(new Date(session.loginTime), "MMM d, HH:mm")}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDistanceToNow(new Date(session.loginTime), { addSuffix: true })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-slate-800">
                        {session.durationSeconds ? formatDuration(session.durationSeconds) : (
                           <span className="text-indigo-600 font-semibold animate-pulse flex items-center gap-1.5">
                             <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                             Active
                           </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium text-slate-600">
                      {session.recordingSizeBytes ? formatBytes(session.recordingSizeBytes) : "—"}
                    </TableCell>
                    <TableCell>
                      {session.recordingStatus === "active" ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                          Recording
                        </div>
                      ) : session.uploadStatus === "completed" ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Stored
                        </div>
                      ) : session.uploadStatus === "failed" ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 border border-red-100 text-red-700 text-[11px] font-bold uppercase tracking-wider">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          Failed
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-slate-600 border-slate-200 capitalize shadow-sm bg-white">{session.uploadStatus}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/sessions/${session.id}`} className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" onClick={(e: any) => e.stopPropagation()}>
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          onClick={(e) => e.stopPropagation()} disabled={!session.recordingUrl}>
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          onClick={(e) => handleDelete(session.id, e)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs font-medium text-slate-500">
            {total > 0
              ? `Showing ${(page - 1) * limit + 1} to ${Math.min(page * limit, total)} of ${total} entries`
              : "0 entries"}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium" onClick={() => setPage(1)} disabled={page === 1}>First</Button>
            <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
            <div className="flex items-center justify-center px-4 h-8 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm">
              Page {page} of {Math.max(1, totalPages)}
            </div>
            <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
            <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>Last</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
