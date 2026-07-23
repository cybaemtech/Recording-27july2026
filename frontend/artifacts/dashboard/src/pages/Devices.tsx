import { useState } from "react";
import { useListDevices } from "@workspace/api-client-react";
import { Search, Terminal, ChevronUp, ChevronDown, ChevronsUpDown, Monitor, Smartphone, Server } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function getOsIcon(os: string) {
  if (!os) return <Monitor className="w-3.5 h-3.5" />;
  const lower = os.toLowerCase();
  if (lower.includes('mac') || lower.includes('ios')) return <Smartphone className="w-3.5 h-3.5" />;
  if (lower.includes('linux')) return <Server className="w-3.5 h-3.5" />;
  return <Monitor className="w-3.5 h-3.5" />;
}

type SortField = "name" | "operatingSystem" | "agentVersion" | "isOnline" | "lastSeenAt";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 ml-1 text-slate-300" />;
  return dir === "asc"
    ? <ChevronUp className="w-3 h-3 ml-1 text-indigo-600" />
    : <ChevronDown className="w-3 h-3 ml-1 text-indigo-600" />;
}

export default function Devices() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [osFilter, setOsFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const limit = 20;

  const params: any = {
    page,
    limit,
    ...(search ? { search } : {}),
    ...(osFilter !== "all" ? { os: osFilter } : {}),
  };

  const { data: response, isLoading } = useListDevices(params);

  let devices = response?.data || [];
  const total = response?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Client-side status filter
  if (statusFilter === "online") devices = devices.filter((d: any) => d.isOnline);
  if (statusFilter === "offline") devices = devices.filter((d: any) => !d.isOnline);

  // Client-side sort
  devices = [...devices].sort((a: any, b: any) => {
    let va: any, vb: any;
    if (sortField === "name") { va = a.name; vb = b.name; }
    else if (sortField === "operatingSystem") { va = a.operatingSystem; vb = b.operatingSystem; }
    else if (sortField === "agentVersion") { va = a.agentVersion ?? ""; vb = b.agentVersion ?? ""; }
    else if (sortField === "isOnline") { va = a.isOnline ? 1 : 0; vb = b.isOnline ? 1 : 0; }
    else if (sortField === "lastSeenAt") { va = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0; vb = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0; }
    if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === "asc" ? va - vb : vb - va;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const handleSearch = (val: string) => { setSearch(val); setPage(1); };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Devices</h2>
          <p className="text-slate-500 text-sm mt-1">Monitored endpoints and agent status.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
            {total} endpoints
          </div>
          <Button variant="outline" className="bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm rounded-lg font-medium gap-2">
            <Terminal className="w-4 h-4" /> Deploy Agent
          </Button>
        </div>
      </div>

      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center gap-4 flex-wrap bg-white">
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search hostnames..."
              className="pl-10 h-10 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 rounded-lg text-sm"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Select value={osFilter} onValueChange={(v) => { setOsFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36 h-10 bg-slate-50 border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
              <SelectValue placeholder="OS" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">All OS</SelectItem>
              <SelectItem value="Windows">Windows</SelectItem>
              <SelectItem value="macOS">macOS</SelectItem>
              <SelectItem value="Linux">Linux</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36 h-10 bg-slate-50 border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="online">Connected</SelectItem>
              <SelectItem value="offline">Disconnected</SelectItem>
            </SelectContent>
          </Select>
          {(search || osFilter !== "all" || statusFilter !== "all") && (
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 h-10 px-4 rounded-lg font-medium"
              onClick={() => { setSearch(""); setOsFilter("all"); setStatusFilter("all"); setPage(1); }}>
              Clear
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 pl-6 cursor-pointer select-none group" onClick={() => handleSort("name")}>
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">Hostname <SortIcon active={sortField === "name"} dir={sortDir} /></span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 cursor-pointer select-none group" onClick={() => handleSort("operatingSystem")}>
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">OS <SortIcon active={sortField === "operatingSystem"} dir={sortDir} /></span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 cursor-pointer select-none group" onClick={() => handleSort("agentVersion")}>
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">Agent Version <SortIcon active={sortField === "agentVersion"} dir={sortDir} /></span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 cursor-pointer select-none group" onClick={() => handleSort("isOnline")}>
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">Status <SortIcon active={sortField === "isOnline"} dir={sortDir} /></span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 py-3.5 cursor-pointer select-none group" onClick={() => handleSort("lastSeenAt")}>
                  <span className="flex items-center group-hover:text-slate-700 transition-colors">Last Seen <SortIcon active={sortField === "lastSeenAt"} dir={sortDir} /></span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-slate-400 text-sm font-medium">
                    Scanning endpoints...
                  </TableCell>
                </TableRow>
              ) : devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-slate-500 text-sm">
                    No devices found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                devices.map((device: any) => (
                  <TableRow key={device.id} className="border-slate-100 hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    onClick={() => window.location.href = `/devices/${device.id}`}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3 py-1">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                          {getOsIcon(device.operatingSystem)}
                        </div>
                        <div className="font-mono text-[13px] font-bold text-slate-800">{device.name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-600">{device.operatingSystem}</TableCell>
                    <TableCell className="font-mono text-xs font-medium text-slate-500">
                      v{device.agentVersion || "Unknown"}
                    </TableCell>
                    <TableCell>
                      {device.isOnline ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Connected
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 border-slate-200 bg-white uppercase text-[10px] tracking-wider font-bold shadow-sm">Disconnected</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-500">
                      {device.lastSeenAt ? formatDistanceToNow(new Date(device.lastSeenAt), { addSuffix: true }) : "Never"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs font-medium text-slate-500">
            {total > 0 ? `Showing ${(page - 1) * limit + 1} to ${Math.min(page * limit, total)} of ${total} entries` : "0 entries"}
          </div>
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
            <div className="flex items-center justify-center px-4 h-8 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm">
              Page {page} of {Math.max(1, totalPages)}
            </div>
            <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
